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
*             properties:
*               vendorid:
*                 type: bigint
*                 description: Unique identifier for the vendor (auto-generated)
*                 example: 1
*               address:
*                 type: string
*                 description: Address of the vendor
*                 example: "123 Main St, City, Country"
*               companyname:
*                 type: string
*                 description: Name of the vendor company
*                 example: "ABC Pvt Ltd"
*               createddate:
*                 type: string
*                 format: date-time
*                 description: Date when the vendor was created
*                 example: "2024-06-01T12:00:00Z"
*               emailid:
*                 type: string
*                 description: Email address of the vendor
*                 example: "abc@abc"
*               isactive:
*                 type: boolean
*                 description: Indicates if the vendor is active
*                 example: true
*               phoneno:
*                 type: bigint
*                 description: Phone number of the vendor
*                 example: 1234567890
*               registrationid:
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
*                   description: HTTP status code
*                   example: 201
*                 message:
*                   type: string
*                   description: Response message
*                   example: "Vendor added successfully"
*                 data:
*                   type: object
*                   description: Details of the created vendor
*                   properties:
*                     vendorid:
*                       type: bigint
*                       description: Unique identifier for the vendor
*                       example: 1
*                     address:
*                       type: string
*                       description: Address of the vendor
*                       example: "123 Main St, City, Country"
*                     companyname:
*                       type: string
*                       description: Name of the vendor company
*                       example: "ABC Pvt Ltd"
*                     createddate:
*                       type: string
*                       format: date-time
*                       description: Date when the vendor was created
*                       example: "2024-06-01T12:00:00Z"
*                     emailid:
*                       type: string
*                       description: Email address of the vendor
*                       example: "abc@abc"
*                     isactive:
*                       type: boolean
*                       description: Indicates if the vendor is active
*                       example: true
*                     phoneno:
*                       type: bigint
*                       description: Phone number of the vendor
*                       example: 1234567890
*                     registrationid:
*                       type: string
*                       description: Registration ID of the vendor
*                       example: "REG12345"
*       400:
*         description: Bad request - Invalid input data
*       500:
*         description: Internal server error
*/