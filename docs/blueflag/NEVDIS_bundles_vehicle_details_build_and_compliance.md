# products/NEVDIS/bundles/vehicle_details_build_and_compliance

(Extracted from api-docs.blueflag.com.au page bundle, 2026-10-16. Text only, order preserved.)

components

Vehicle Details Build and Compliance

This is a combination of 

Vehicle Details

 & 

Build and Compliance

Attributes

A unique 17 character code used to identify individual motor vehicles.

chassis

A unique code used to identify individual motor vehicles. Used before January 1989 in Australia.

registration.plate

An alphanumeric code used to identify vehicles. The plate is visible on the front and rear of most vehicles.

registration.state

The area within Australia where the vehicle is registered.

One of: ACT, NSW, NT, QLD, SA, TAS, VIC, WA

The manufacturer of the vehicle.

The specific product within the manufacturers range.

Primary paint colour of the vehicle noted by the road authority.

body_type

Classification of the vehicle shape noted by the road authority.

vehicle_type

Category that the vehicle is registered as.

engine_number

A unique alphanumeric sequence stamped onto the engine by the manufacturer.

compliance_plate

string (YYYY-MM)

Month and year the vehicle was confirmed as meeting local regulations.

Not available for TAS

year_of_manufacture

string (YYYY)

Year the vehicle was assembled.

 Not available for NSW 

Glass's National Vehicle Identification Code (NVIC) is a unique character code used to identify an individual motor vehicle.

This value is only available to Glass's customers. 

Please contact us for futher information if you're interested.

ENDPOINT URL

https://sandbox.blueflag.com.au/nevdis/vehicle_details_build_and_compliance?plate=TEST00&state=VIC&include_nvic=true"


EXAMPLE REQUEST

curl "https://sandbox.blueflag.com.au/nevdis/vehicle_details_build_and_compliance?plate=TEST00&state=VIC&include_nvic=true" -H "Authorization: secret_SANDBOX_f1nlZOh0Xr1JvMgJy0d0l9i5JybnBEAYfl7isuU0_o-1GkBsaN8f"


EXAMPLE RESPONSE

{
  "requested_at": "2025-08-13T00:27:24.161Z",
  "request_id": "cb072781-1084-480c-a043-65242a8a908b",
  "result": [
    {
      "vin": "KMHH351EMKU00TEST",
      "chassis": null,
      "registration": {
        "plate": "TEST00",
        "state": "VIC"
      },
      "nvic": "042519",
      "make": "HYUNDAI",
      "model": "I30",
      "colour": "SILVER OR CHROME",
      "body_type": "CAR/SEDAN",
      "vehicle_type": "CAR / SMALL PASSENGER VEHICLE",
      "engine_number": "G40000000000",
      "compliance_plate": "2019-07",
      "year_of_manufacture": "2019"
    }
  ]
}

