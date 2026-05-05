-- Allow partial provider creation by removing strict NOT NULL constraints.
-- Keep primary key (serviceproviderid) unchanged.

ALTER TABLE public."serviceprovider"
  ALTER COLUMN "buildingName" DROP NOT NULL,
  ALTER COLUMN "emailId" DROP NOT NULL,
  ALTER COLUMN "firstName" DROP NOT NULL,
  ALTER COLUMN "isactive" DROP NOT NULL,
  ALTER COLUMN "lastName" DROP NOT NULL,
  ALTER COLUMN "locality" DROP NOT NULL,
  ALTER COLUMN "mobileNo" DROP NOT NULL,
  ALTER COLUMN "pincode" DROP NOT NULL,
  ALTER COLUMN "rating" DROP NOT NULL,
  ALTER COLUMN "street" DROP NOT NULL;
