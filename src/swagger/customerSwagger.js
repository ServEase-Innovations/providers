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