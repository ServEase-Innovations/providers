/**
 * @swagger
 * /api/customer/{id}:
 *   get:
 *     summary: get customer details by ID
 *     description: Retrieve customer information using their unique ID.
 *     tags:
 *       - Customer
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The unique identifier of the customer
 *     responses:
 *      200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   description: HTTP status code
 *                   example: 200
 *                 message:
 *                   type: string
 *                   description: Response message
 *                   example: "Customer retrieved successfully"
 *                 data:
 *                   type: object
 *                   description: Customer details (camelCase field names)
 *                   properties:
 *                     customerId:
 *                       type: string
 *                       description: Customer ID
 *                       example: "52"
 *                     firstName:
 *                       type: string
 *                       description: Customer first name
 *                       example: "Subhrajit"
 *                     lastName:
 *                       type: string
 *                       description: Customer last name
 *                       example: "Dutta"
 *                     emailId:
 *                       type: string
 *                       description: Customer email
 *                       example: "abs@abc.com"
 *      400:
 *         description: Missing or invalid request parameters *
 *      500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/customers:
 *   get:
 *     summary: Get paginated list of customers
 *     description: Retrieve a paginated list of customers. If pagination parameters are not provided, all customers will be returned.
 *     tags:
 *       - Customer
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         required: false
 *         description: Page number for pagination (starts from 1)
 *       - in: query
 *         name: size
 *         schema:
 *           type: integer
 *         required: false
 *         description: Number of records per page
 *     responses:
 *      200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   description: HTTP status code
 *                   example: 200
 *                 message:
 *                   type: string
 *                   description: Response message
 *                   example: "Customers retrieved successfully"
 *                 data:
 *                   type: object
 *                   description: Paginated customer data
 *                   properties:
 *                     totalItems:
 *                       type: integer
 *                       description: Total number of customers
 *                       example: 50
 *                     results:
 *                       type: array
 *                       description: List of customers for the current page
 *                       items:
 *                         type: object
 *                         properties:
 *                           customerId:
 *                             type: string
 *                             description: Customer ID
 *                             example: "52"
 *                           firstName:
 *                             type: string
 *                             description: Customer first name
 *                             example: "Subhrajit"
 *                           lastName:
 *                             type: string
 *                             description: Customer last name
 *                             example: "Dutta"
 *                           emailId:
 *                             type: string
 *                             description: Customer email
 *                             example: "abe@abstract.com"
 *                     totalPages:
 *                       type: integer
 *                       description: Total number of pages
 *                       example: 5
 *                     currentPage:
 *                       type: integer
 *                       description: Current page number
 *                       example: 1
 *      400:
 *         description: Missing or invalid request parameters
 *      500:
 *         description: Internal server error
 */
/**
 * @swagger
 * /api/customer:
 *   post:
 *     summary: Create a new customer
 *     description: Create a new customer in the system
 *     tags:
 *       - Customer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *               - emailId
 *             properties:
 *               firstName:
 *                 type: string
 *                 description: Customer first name
 *                 example: "John"
 *               lastName:
 *                 type: string
 *                 description: Customer last name
 *                 example: "Doe"
 *               middleName:
 *                 type: string
 *                 description: Middle name
 *               emailId:
 *                 type: string
 *                 description: Customer email address
 *                 example: "john@example.com"
 *               mobileNo:
 *                 type: string
 *                 description: Customer mobile number
 *                 example: "9876543210"
 *               alternateNo:
 *                 type: string
 *                 description: Alternate mobile number
 *                 example: "9876543211"
 *               locality:
 *                 type: string
 *                 description: Customer locality
 *                 example: "Indiranagar"
 *               pinCode:
 *                 type: integer
 *                 description: Area pin code
 *                 example: 560038
 *               gender:
 *                 type: string
 *                 enum: [MALE, FEMALE, OTHER]
 *               buildingName:
 *                 type: string
 *               currentLocation:
 *                 type: string
 *               languageKnown:
 *                 type: array
 *                 description: Response lists languages; DB stores comma-separated text. Request may send array or comma-separated string.
 *                 items:
 *                   type: string
 *               profilePic:
 *                 type: string
 *     responses:
 *       201:
 *         description: Customer created successfully
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
 *                   example: "Customer created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     customerId:
 *                       type: string
 *                       example: "53"
 *                     firstName:
 *                       type: string
 *                       example: "John"
 *                     lastName:
 *                       type: string
 *                       example: "Doe"
 *                     emailId:
 *                       type: string
 *                       example: "john@example.com"
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Internal server error
 */
/**
 * @swagger
 * /api/customer/{id}:
 *   put:
 *     summary: Update customer details
 *     description: Update an existing customer's information
 *     tags:
 *       - Customer
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Customer ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: "Sara"
 *               lastName:
 *                 type: string
 *                 example: "Khan"
 *               emailId:
 *                 type: string
 *                 example: "sara.khan@gmail.com"
 *               mobileNo:
 *                 type: integer
 *                 example: 9876543210
 *               alternateNo:
 *                 type: integer
 *                 example: 9123456789
 *               locality:
 *                 type: string
 *                 example: "Indiranagar"
 *               pinCode:
 *                 type: integer
 *                 example: 560038
 *     responses:
 *       200:
 *         description: Customer updated successfully
 *       404:
 *         description: Customer not found
 *       500:
 *         description: Internal server error
 */
