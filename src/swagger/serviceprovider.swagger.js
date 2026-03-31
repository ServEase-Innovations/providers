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
 *               - housekeepingRoles
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
 *               housekeepingRoles:
 *                 type: array
 *                 minItems: 1
 *                 description: All roles this provider can work as (COOK, MAID, NANNY, ...). Only source of roles on create.
 *                 items:
 *                   type: string
 *                   example: "COOK"
 *
 *               nannyCareType:
 *                 type: array
 *                 description: Types of nanny care offered (optional). Each item must be one of the enum values.
 *                 items:
 *                   type: string
 *                   enum:
 *                     - ELDERLY_CARE
 *                     - INFANT_CARE
 *                     - TODDLER_CARE
 *                     - CHILD_CARE
 *                     - SPECIAL_NEEDS
 *                 example:
 *                   - ELDERLY_CARE
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
 *               languages:
 *                 type: array
 *                 description: Stored as languageKnown (comma-separated). Use this or languageKnown string.
 *                 items:
 *                   type: string
 *                   example: "Bengali"
 *
 *               currentLocation:
 *                 type: string
 *               nearbyLocation:
 *                 type: string
 *               location:
 *                 type: string
 *               kycType:
 *                 type: string
 *               kycNumber:
 *                 type: string
 *               kycImage:
 *                 type: string
 *               keyFacts:
 *                 type: boolean
 *               agentReferralId:
 *                 description: Vendor / agent id; stored as vendorId. Omit or null if none.
 *                 oneOf:
 *                   - type: integer
 *                   - type: string
 *
 *           example:
 *             firstName: "Rammy1"
 *             middleName: ""
 *             lastName: "Singha Roy"
 *             mobileNo: 8555698558
 *             alternateNo: 0
 *             emailId: "rammy1@gmail.com"
 *             gender: "FEMALE"
 *             dob: "2003-05-30"
 *             housekeepingRoles:
 *               - "COOK"
 *               - "NANNY"
 *             nannyCareType:
 *               - ELDERLY_CARE
 *               - CHILD_CARE
 *             diet: "NONVEG"
 *             languages:
 *               - "Bengali"
 *             cookingSpeciality: "NONVEG"
 *             experience: 1
 *             buildingName: "notSpecified"
 *             street: "Bhandarhati-Dhaniakhali Road"
 *             locality: "Bhagabatipur"
 *             pincode: 712405
 *             latitude: 22.867972
 *             longitude: 88.108881
 *             currentLocation: "V495+4FH, Bhandarhati-Dhaniakhali Rd, Bhagabatipur, West Bengal 712405, India"
 *             nearbyLocation: ""
 *             location: "V495+4FH, Bhandarhati-Dhaniakhali Rd, Bhagabatipur, West Bengal 712405, India"
 *             timeslot: "06:00-20:00"
 *             isactive: true
 *             kycType: "AADHAR"
 *             kycNumber: "785569858588"
 *             keyFacts: true
 *             agentReferralId: null
 *             permanentAddress:
 *               field1: "notSpecified"
 *               field2: "Bhandarhati-Dhaniakhali Road"
 *               ctarea: "Bhagabatipur"
 *               pinno: "712405"
 *               state: "West Bengal"
 *               country: "India"
 *             correspondenceAddress:
 *               field1: "notSpecified"
 *               field2: "Bhandarhati-Dhaniakhali Road"
 *               ctarea: "Bhagabatipur"
 *               pinno: "712405"
 *               state: "West Bengal"
 *               country: "India"
 *
 *     responses:
 *       201:
 *         description: Service provider created successfully
 *       400:
 *         description: Invalid request payload
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/service-providers/providers:
 *   get:
 *     summary: Get all service providers
 *     description: Retrieve all service providers. If `page` and `size` query params are provided, results are paginated.
 *     tags:
 *       - Service Providers
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           example: 1
 *       - in: query
 *         name: size
 *         required: false
 *         schema:
 *           type: integer
 *           example: 10
 *     responses:
 *       200:
 *         description: Service providers retrieved successfully
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/service-providers/serviceprovider/{id}:
 *   get:
 *     summary: Get service provider by ID
 *     description: Retrieve a single service provider by its `serviceproviderid`.
 *     tags:
 *       - Service Providers
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 3552
 *     responses:
 *       200:
 *         description: Service provider retrieved successfully
 *       404:
 *         description: Provider not found
 *       500:
 *         description: Internal server error
 */
/**
 * @swagger
 * /api/service-providers/serviceprovider/{id}:
 *   put:
 *     summary: Update service provider by ID
 *     description: Update an existing service provider using its `serviceproviderid`.
 *     tags:
 *       - Service Providers
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 3552
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
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
 *               housekeepingRoles:
 *                 type: array
 *                 description: When sent, replaces all roles in serviceprovider_roles and syncs legacy housekeepingRole column to the first entry.
 *                 items:
 *                   type: string
 *                   example: "MAID"
 *
 *               nannyCareType:
 *                 type: array
 *                 description: Replaces stored care types. Send [] to clear. Each item must be one of the enum values.
 *                 items:
 *                   type: string
 *                   enum:
 *                     - ELDERLY_CARE
 *                     - INFANT_CARE
 *                     - TODDLER_CARE
 *                     - CHILD_CARE
 *                     - SPECIAL_NEEDS
 *
 *               diet:
 *                 type: string
 *                 example: "BOTH"
 *
 *               cookingSpeciality:
 *                 type: string
 *                 example: "South Indian"
 *
 *               languageKnown:
 *                 type: string
 *                 example: "Hindi, English"
 *
 *               isactive:
 *                 type: boolean
 *                 example: true
 *
 *               vendorId:
 *                 type: integer
 *                 example: 2
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
 *               timeslot:
 *                 type: string
 *                 example: "06:00-20:00"
 *
 *     responses:
 *       200:
 *         description: Service provider updated successfully
 *       404:
 *         description: Provider not found
 *       400:
 *         description: Invalid request payload
 *       500:
 *         description: Internal server error
 */