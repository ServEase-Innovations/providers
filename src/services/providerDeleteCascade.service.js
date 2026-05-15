import { sequelize } from "../config/database.js";
import Provider from "../model/provider.model.js";
import Address from "../model/address.model.js";
import ProviderWeeklySlot from "../model/providerWeeklySlot.model.js";
import ServiceProviderRole from "../model/serviceProviderRole.model.js";

async function q(sql, replacements, transaction, optionalTable) {
  try {
    await sequelize.query(sql, { replacements, transaction });
  } catch (e) {
    if (optionalTable && e?.parent?.code === "42P01") return;
    throw e;
  }
}

/**
 * Permanently removes a service provider and related rows (availability, roles, slots,
 * engagements / payments-domain tables when present in the same DB).
 * Uses optional SQL for tables that may not exist in every environment.
 */
export async function deleteProviderCascade(rawId) {
  const serviceProviderId = Number(rawId);
  if (!Number.isFinite(serviceProviderId) || serviceProviderId <= 0) {
    const err = new Error("Invalid service provider id");
    err.statusCode = 400;
    throw err;
  }

  const provider = await Provider.findByPk(serviceProviderId);
  if (!provider) {
    return null;
  }

  const corr = provider.get("correspondenceAddressId");
  const perm = provider.get("permanentAddressId");
  const addressIds = [...new Set([corr, perm].filter((x) => x != null))];

  const pid = { pid: serviceProviderId };

  const transaction = await sequelize.transaction();

  try {
    await q(
      `DELETE FROM service_day_otps
       WHERE service_day_id IN (
         SELECT sd.service_day_id FROM service_days sd
         INNER JOIN engagements e ON e.engagement_id = sd.engagement_id
         WHERE e.serviceproviderid = :pid
       )`,
      pid,
      transaction,
      true
    );

    await q(
      `DELETE FROM service_days
       WHERE engagement_id IN (SELECT engagement_id FROM engagements WHERE serviceproviderid = :pid)`,
      pid,
      transaction,
      true
    );

    await q(
      `DELETE FROM provider_reviews
       WHERE engagement_id IN (SELECT engagement_id FROM engagements WHERE serviceproviderid = :pid)`,
      pid,
      transaction,
      false
    );

    await q(
      `DELETE FROM engagement_modifications
       WHERE engagement_id IN (SELECT engagement_id FROM engagements WHERE serviceproviderid = :pid)`,
      pid,
      transaction,
      false
    );

    await q(
      `DELETE FROM wallet_transaction
       WHERE engagement_id IN (SELECT engagement_id FROM engagements WHERE serviceproviderid = :pid)`,
      pid,
      transaction,
      true
    );

    await q(
      `DELETE FROM wallet_transactions
       WHERE engagement_id IN (SELECT engagement_id FROM engagements WHERE serviceproviderid = :pid)`,
      pid,
      transaction,
      true
    );

    await q(
      `DELETE FROM customer_leaves
       WHERE engagement_id IN (SELECT engagement_id FROM engagements WHERE serviceproviderid = :pid)`,
      pid,
      transaction,
      false
    );

    await q(
      `DELETE FROM provider_availability
       WHERE engagement_id IN (SELECT engagement_id FROM engagements WHERE serviceproviderid = :pid)`,
      pid,
      transaction,
      false
    );

    await q(
      `DELETE FROM provider_leaves
       WHERE engagement_id IN (SELECT engagement_id FROM engagements WHERE serviceproviderid = :pid)`,
      pid,
      transaction,
      false
    );

    await q(
      `DELETE FROM payouts
       WHERE engagement_id IN (SELECT engagement_id FROM engagements WHERE serviceproviderid = :pid)`,
      pid,
      transaction,
      false
    );

    await q(
      `DELETE FROM provider_ledger
       WHERE engagement_id IN (SELECT engagement_id FROM engagements WHERE serviceproviderid = :pid)`,
      pid,
      transaction,
      true
    );

    await q(
      `DELETE FROM in_app_notifications
       WHERE engagement_id IN (SELECT engagement_id FROM engagements WHERE serviceproviderid = :pid)
          OR (recipient_type = 'provider' AND recipient_id = :pid)`,
      pid,
      transaction,
      true
    );

    await q(`DELETE FROM engagements WHERE serviceproviderid = :pid`, pid, transaction, false);

    await q(
      `DELETE FROM provider_reviews
       WHERE serviceprovider_engagement_id IN (
         SELECT id FROM serviceprovider_engagement WHERE serviceproviderid = :pid
       )`,
      pid,
      transaction,
      false
    );

    await q(
      `DELETE FROM booking_transaction
       WHERE engagement_id IN (SELECT id FROM serviceprovider_engagement WHERE serviceproviderid = :pid)`,
      pid,
      transaction,
      false
    );

    await q(
      `DELETE FROM customer_holidays
       WHERE engagement_id IN (SELECT id FROM serviceprovider_engagement WHERE serviceproviderid = :pid)`,
      pid,
      transaction,
      false
    );

    await q(
      `DELETE FROM customer_payments
       WHERE engagement_id IN (SELECT id FROM serviceprovider_engagement WHERE serviceproviderid = :pid)`,
      pid,
      transaction,
      false
    );

    await q(
      `DELETE FROM customer_used_coupons
       WHERE engagement_id IN (SELECT id FROM serviceprovider_engagement WHERE serviceproviderid = :pid)`,
      pid,
      transaction,
      false
    );

    await q(`DELETE FROM serviceprovider_engagement WHERE serviceproviderid = :pid`, pid, transaction, false);

    await q(
      `DELETE FROM service_provider_request_comments
       WHERE requestid IN (SELECT requestid FROM serviceproviderrequest WHERE serviceproviderid = :pid)`,
      pid,
      transaction,
      false
    );

    await q(`DELETE FROM serviceproviderrequest WHERE serviceproviderid = :pid`, pid, transaction, false);

    await q(
      `DELETE FROM kyc_comments WHERE kyc_id IN (SELECT kyc_id FROM kyc WHERE service_provider_id = :pid)`,
      pid,
      transaction,
      false
    );

    await q(`DELETE FROM kyc WHERE service_provider_id = :pid`, pid, transaction, false);

    await sequelize.query(
      `UPDATE service_provider_leave SET backup_by_id = NULL WHERE backup_by_id = :pid`,
      { replacements: pid, transaction }
    );

    await q(`DELETE FROM service_provider_leave WHERE serviceproviderid = :pid`, pid, transaction, false);

    await q(`DELETE FROM attendance WHERE serviceproviderid = :pid`, pid, transaction, false);
    await q(`DELETE FROM customerfeedback WHERE serviceproviderid = :pid`, pid, transaction, false);
    await q(`DELETE FROM leave_balance WHERE serviceproviderid = :pid`, pid, transaction, false);

    await q(`DELETE FROM provider_availability WHERE serviceproviderid = :pid`, pid, transaction, false);
    await q(`DELETE FROM provider_leaves WHERE serviceproviderid = :pid`, pid, transaction, false);

    await q(`DELETE FROM provider_ledger WHERE serviceproviderid = :pid`, pid, transaction, true);
    await q(`DELETE FROM payouts WHERE serviceproviderid = :pid`, pid, transaction, false);

    await q(`DELETE FROM service_provider_payment WHERE serviceproviderid = :pid`, pid, transaction, false);
    await q(`DELETE FROM service_provider_feedback WHERE service_provider_id = :pid`, pid, transaction, false);
    await q(
      `DELETE FROM service_provider_used_coupons WHERE service_provider_id = :pid`,
      pid,
      transaction,
      false
    );

    await sequelize.query(
      `UPDATE customerrequest SET serviceproviderid = NULL WHERE serviceproviderid = :pid`,
      { replacements: pid, transaction }
    );

    await ServiceProviderRole.destroy({
      where: { serviceProviderId },
      transaction,
    });

    await ProviderWeeklySlot.destroy({
      where: { serviceProviderId },
      transaction,
    });

    await sequelize.query(`DELETE FROM provider_daily_slots WHERE serviceproviderid = :pid`, {
      replacements: pid,
      transaction,
    });

    await Provider.destroy({
      where: { serviceProviderId },
      transaction,
    });

    if (addressIds.length > 0) {
      await Address.destroy({
        where: { id: addressIds },
        transaction,
      });
    }

    await transaction.commit();
    return { serviceProviderId, deletedAddressIds: addressIds };
  } catch (e) {
    await transaction.rollback();
    throw e;
  }
}
