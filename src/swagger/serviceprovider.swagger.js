/**
* @swagger
* /api/service-providers/serviceprovider/add:
*   post:
*     summary: Add a new service provider
*     description: Create a new service provider with the provided details.
*     tags:
*       - Service Providers
*     requestBody:
*       required: true
*       content:
*         application/json:
*           schema:
*             type: object
*             properties:
*               serviceproviderid:
*                 type: bigint
*                 description: Unique identifier for the service provider (auto-generated)
*                 example: 1
*               dob:
*                 type: string
*                 format: date
*                 description: Date of birth of the service provider
*                 example: "1990-01-01"
*               kyc:
*                 type: string
*                 description: KYC details of the service provider
*                 example: "KYC12345"
*               age:
*                 type: integer
*                 description: Age of the service provider
*                 example: 30
*               alternateno:
*                 type: bigint
*                 description: Alternate phone number of the service provider
*                 example: 9876543210
*               buildingname:
*                 type: string
*                 description: Building name of the service provider's address
*                 example: "Sunshine Apartments"
*               cookingspeciality:
*                 type: string
*                 description: Cooking speciality of the service provider
*                 example: "Italian Cuisine"
*               currentlocation:
*                 type: string
*                 description: Current location of the service provider
*                 example: "New York"
*               diet:
*                 type: string
*                 description: Diet preference of the service provider
*                 example: "Vegetarian"
*               emailid:
*                 type: string
*                 description: Email address of the service provider
*                 example: "abc@abst.com"
*               enrolleddate:
*                 type: string
*                 format: date-time
*                 description: Date when the service provider was enrolled
*                 example: "2024-06-01T12:00:00Z"
*               experience:
*                 type: integer
*                 description: Years of experience of the service provider
*                 example: 5
*               firstname:
*                 type: string
*                 description: First name of the service provider
*                 example: "John"
*               gender:
*                 type: string
*                 description: Gender of the service provider
*                 example: "Male"
*               geohash4:
*                 type: string
*                 description: Geohash of the service provider's location (4 characters)
*                 example: "u4pr"
*               geohash5:
*                 type: string
*                 description: Geohash of the service provider's location (6 characters)
*                 example: "u4pruy"
*               geohash6:
*                 type: string
*                 description: Geohash of the service provider's location (8 characters)
*                 example: "u4pruydqq"
*               geohash7:
*                 type: string
*                 description: Geohash of the service provider's location (10 characters)
*                 example: "u4pruydqqv"
*               housekeepingrole:
*                 type: string
*                 description: Housekeeping role of the service provider
*                 example: "Cleaner"
*               idno:
*                 type: string
*                 description: ID number of the service provider
*                 example: "ID12345"
*               info:
*                 type: string
*                 description: Additional information about the service provider
*                 example: "Available on weekends"
*               isactive:
*                 type: boolean
*                 description: Indicates if the service provider is active
*                 example: true
*               languageknown:
*                 type: string
*                 description: Languages known by the service provider
*                 example: "English, Spanish"
*               lastname:
*                 type: string
*                 description: Last name of the service provider
*                 example: "Doe"
*               latitude:
*                 type: decimal
*                 description: Latitude of the service provider's location
*                 example: 40.7128
*               locality:
*                 type: string
*                 description: Locality of the service provider
*                 example: "Manhattan"
*               location:
*                 type: string
*                 description: Location details of the service provider
*                 example: "123 Main St, New York, NY"
*               longitude:
*                 type: decimal
*                 description: Longitude of the service provider's location
*                 example: -74.0060
*               middlename:
*                   type: string
*                   description: service provider middle name
*                   example: "john"
*               mobileno:
*                   type: bigint
*                   description: mobile no of service provider
*                   example: 1234567890
*               permanentAddress: 
*                   type: object
*                   description: Paginated customer data
*                   properties:  
*                       field1:
*                           type: string
*                           description: address field 
*                           example: "123"
*                       field2:
*                           type: string
*                           description: address field 
*                           example: "123 st"
*                       ctArea:
*                           type: string
*                           description: address ct area 
*                           example: "123 st"
*                       pinno:
*                           type: string
*                           description: address pin code 
*                           example: "12345"
*                       state:
*                           type: string
*                           description: state 
*                           example: "delhi"
*                       country:
*                           type: string
*                           description: state 
*                           example: "india"
*               correspondenceAddress: 
*                   type: object
*                   description: Paginated customer data
*                   properties:  
*                       field1:
*                           type: string
*                           description: address field 
*                           example: "123"
*                       field2:
*                           type: string
*                           description: address field 
*                           example: "123 st"
*                       ctArea:
*                           type: string
*                           description: address ct area 
*                           example: "123 st"
*                       pinno:
*                           type: string
*                           description: address pin code 
*                           example: "12345"
*                       state:
*                           type: string
*                           description: state 
*                           example: "delhi"
*                       country:
*                           type: string
*                           description: state 
*                           example: "india"
*       400:
*         description: Bad request - Invalid input data
*       500:
*         description: Internal server error
*/