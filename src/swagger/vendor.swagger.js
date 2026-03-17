/**
 * @swagger
 * /api/vendor/add:
 *   post:
 *     summary: Add a new vendor
 *     description: Create a new vendor with the provided details.
 *     tags:
 *       - Vendor
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - companyName
 *               - address
 *               - emailId
 *               - phoneNo
 *             properties:
 *               companyName:
 *                 type: string
 *                 description: Name of the vendor company
 *                 example: "ABC Pvt Ltd"
 *               address:
 *                 type: string
 *                 description: Address of the vendor
 *                 example: "123 Main St, City, Country"
 *               createdDate:
 *                 type: string
 *                 format: date-time
 *                 description: Date when the vendor was created
 *                 example: "2024-06-01T12:00:00Z"
 *               emailId:
 *                 type: string
 *                 format: email
 *                 description: Email address of the vendor
 *                 example: "abc@abc.com"
 *               isActive:
 *                 type: boolean
 *                 description: Indicates if the vendor is active
 *                 example: true
 *               phoneNo:
 *                 type: string
 *                 description: Phone number of the vendor
 *                 example: "1234567890"
 *               registrationId:
 *                 type: string
 *                 description: Registration ID of the vendor
 *                 example: "REG12345"
 *     responses:
 *       201:
 *         description: Vendor created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 201
 *                 message:
 *                   type: string
 *                   example: "Vendor added successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     vendorId:
 *                       type: integer
 *                       format: int64
 *                       description: Auto-generated vendor ID
 *                       example: 1
 *                     companyName:
 *                       type: string
 *                       example: "ABC Pvt Ltd"
 *                     address:
 *                       type: string
 *                       example: "123 Main St, City, Country"
 *                     createdDate:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-06-01T12:00:00Z"
 *                     emailId:
 *                       type: string
 *                       format: email
 *                       example: "abc@abc.com"
 *                     isActive:
 *                       type: boolean
 *                       example: true
 *                     phoneNo:
 *                       type: string
 *                       example: "1234567890"
 *                     registrationId:
 *                       type: string
 *                       example: "REG12345"
 *       400:
 *         description: Bad request - Invalid input data
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/vendors:
 *   get:
 *     summary: Get all vendors
 *     description: Retrieve a list of all vendors.
 *     tags:
 *       - Vendor
 *     responses:
 *       200:
 *         description: List of vendors fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "Vendors fetched successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       vendorId:
 *                         type: integer
 *                         format: int64
 *                         description: Auto-generated vendor ID
 *                         example: 1
 *                       companyName:
 *                         type: string
 *                         example: "ABC Pvt Ltd"
 *                       address:
 *                         type: string
 *                         example: "123 Main St, City, Country"
 *                       createdDate:
 *                         type: string
 *                         format: date-time
 *                         example: "2024-06-01T12:00:00Z"
 *                       emailId:
 *                         type: string
 *                         format: email
 *                         example: "abc@abc.com"
 *                       isActive:
 *                         type: boolean
 *                         example: true
 *                       phoneNo:
 *                         type: string
 *                         example: "1234567890"
 *                       registrationId:
 *                         type: string
 *                         example: "REG12345"
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/vendor/{id}:
 *   get:
 *     summary: Get vendor by ID
 *     description: Retrieve a single vendor by its ID.
 *     tags:
 *       - Vendor
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the vendor
 *     responses:
 *       200:
 *         description: Vendor fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "Vendor fetched successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     vendorId:
 *                       type: integer
 *                       format: int64
 *                       description: Auto-generated vendor ID
 *                       example: 1
 *                     companyName:
 *                       type: string
 *                       example: "ABC Pvt Ltd"
 *                     address:
 *                       type: string
 *                       example: "123 Main St, City, Country"
 *                     createdDate:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-06-01T12:00:00Z"
 *                     emailId:
 *                       type: string
 *                       format: email
 *                       example: "abc@abc.com"
 *                     isActive:
 *                       type: boolean
 *                       example: true
 *                     phoneNo:
 *                       type: string
 *                       example: "1234567890"
 *                     registrationId:
 *                       type: string
 *                       example: "REG12345"
 *                     providers:
 *                       type: array
 *                       description: Providers mapped to this vendor (by vendorId)
 *                       items:
 *                         type: object
 *                         properties:
 *                           serviceproviderid:
 *                             type: integer
 *                             format: int64
 *                             example: 3552
 *                           firstName:
 *                             type: string
 *                             example: "Ronit"
 *                           lastName:
 *                             type: string
 *                             example: "Maity"
 *                           mobileNo:
 *                             type: integer
 *                             example: 9876543210
 *                           emailId:
 *                             type: string
 *                             example: "ronit@gmail.com"
 *                           vendorId:
 *                             type: integer
 *                             example: 1
 *       404:
 *         description: Vendor not found
 *       500:
 *         description: Internal server error
 */