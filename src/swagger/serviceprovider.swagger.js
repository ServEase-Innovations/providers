/**
 * @swagger
 * /api/service-providers/serviceprovider/add:
 *   post:
 *     summary: Add a new service provider
 *     description: Creates a new service provider with address and availability details.
 *     tags:
 *       - Service Providers
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *               - mobileNo
 *               - emailId
 *               - buildingName
 *               - locality
 *               - pincode
 *               - street
 *             properties:
 *
 *               # --- BASIC DETAILS ---
 *
 *               firstName:
 *                 type: string
 *                 example: "Ronit"
 *
 *               middleName:
 *                 type: string
 *                 example: "Kumar"
 *
 *               lastName:
 *                 type: string
 *                 example: "Maity"
 *
 *               mobileNo:
 *                 type: integer
 *                 example: 9876543210
 *
 *               alternateNo:
 *                 type: integer
 *                 example: 9999999999
 *
 *               emailId:
 *                 type: string
 *                 format: email
 *                 example: "ronit@gmail.com"
 *
 *               gender:
 *                 type: string
 *                 example: "MALE"
 *
 *               dob:
 *                 type: string
 *                 format: date
 *                 example: "1992-02-14"
 *
 *               experience:
 *                 type: integer
 *                 example: 10
 *
 *               housekeepingRole:
 *                 type: string
 *                 example: "COOK"
 *
 *               diet:
 *                 type: string
 *                 example: "BOTH"
 *
 *               cookingSpeciality:
 *                 type: string
 *                 example: "BOTH"
 *
 *               languageKnown:
 *                 type: string
 *                 example: "Hindi, English"
 *
 *               isactive:
 *                 type: boolean
 *                 example: true
 *
 *
 *               # --- LOCATION ---
 *
 *               buildingName:
 *                 type: string
 *                 example: "Sunshine Apartments"
 *
 *               street:
 *                 type: string
 *                 example: "Kanakanagar"
 *
 *               locality:
 *                 type: string
 *                 example: "Bengaluru"
 *
 *               pincode:
 *                 type: integer
 *                 example: 560111
 *
 *               latitude:
 *                 type: number
 *                 format: float
 *                 example: 12.90319
 *
 *               longitude:
 *                 type: number
 *                 format: float
 *                 example: 77.57116
 *
 *
 *               # --- AVAILABILITY ---
 *
 *               weeklySlots:
 *                 type: array
 *                 description: Weekly recurring availability slots
 *                 items:
 *                   type: object
 *                   required:
 *                     - dayOfWeek
 *                     - start
 *                     - end
 *                   properties:
 *                     dayOfWeek:
 *                       type: integer
 *                       description: 0 = Sunday, 6 = Saturday
 *                       example: 1
 *                     start:
 *                       type: string
 *                       example: "06:00"
 *                     end:
 *                       type: string
 *                       example: "20:00"
 *
 *               timeslot:
 *                 type: string
 *                 description: Legacy format (used if weeklySlots not provided)
 *                 example: "06:00-20:00"
 *
 *
 *               # --- ADDRESSES ---
 *
 *               permanentAddress:
 *                 type: object
 *                 required:
 *                   - field1
 *                   - ctArea
 *                   - pinNo
 *                   - state
 *                   - country
 *                 properties:
 *                   field1:
 *                     type: string
 *                     example: "Flat 101"
 *                   field2:
 *                     type: string
 *                     example: "Block A"
 *                   ctArea:
 *                     type: string
 *                     example: "Bengaluru"
 *                   pinNo:
 *                     type: string
 *                     example: "560111"
 *                   state:
 *                     type: string
 *                     example: "Karnataka"
 *                   country:
 *                     type: string
 *                     example: "India"
 *
 *               correspondenceAddress:
 *                 type: object
 *                 properties:
 *                   field1:
 *                     type: string
 *                     example: "Flat 101"
 *                   field2:
 *                     type: string
 *                     example: "Block A"
 *                   ctArea:
 *                     type: string
 *                     example: "Bengaluru"
 *                   pinNo:
 *                     type: string
 *                     example: "560111"
 *                   state:
 *                     type: string
 *                     example: "Karnataka"
 *                   country:
 *                     type: string
 *                     example: "India"
 *
 *     responses:
 *       201:
 *         description: Service provider created successfully
 *       400:
 *         description: Invalid request payload
 *       500:
 *         description: Internal server error
 */