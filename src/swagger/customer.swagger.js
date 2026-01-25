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
*                   description: Customer details
*                   properties:
*                     customerid:
*                       type: string
*                       description: Customer ID
*                       example: "52"
*                     firstname:
*                       type: string
*                       description: Customer name
*                       example: "Subhrajit"
*                     lastname:
*                       type: string
*                       description: Customer last name
*                       example: "Dutta"
*                     emailid:
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
*                           customerid:
*                             type: string
*                             description: Customer ID
*                             example: "52"
*                           firstname:
*                             type: string
*                             description: Customer name
*                             example: "Subhrajit"
*                           lastname:
*                             type: string
*                             description: Customer last name
*                             example: "Dutta"
*                           emailid:
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