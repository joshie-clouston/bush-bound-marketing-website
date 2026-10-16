# products/NEVDIS/build_and_compliance

(Extracted from api-docs.blueflag.com.au page bundle, 2026-10-16. Text only, order preserved.)

components

Build and Compliance

A plate or label fitted on the vehicle by the manufacturer or importer. Usually specific to a month and year.

Learn More >

Attributes

A unique 17 character code used to identify individual motor vehicles.

chassis

A unique code used to identify individual motor vehicles. Used before January 1989 in Australia.

registration.plate

An alphanumeric code used to identify vehicles. The plate is visible on the front and rear of most vehicles.

registration.state

The area within Australia where the vehicle is registered.

One of: ACT, NSW, NT, QLD, SA, TAS, VIC, WA

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

https://sandbox.blueflag.com.au/nevdis/build_and_compliance?plate=TEST00&state=VIC&include_nvic=true"


EXAMPLE REQUEST

curl "https://sandbox.blueflag.com.au/nevdis/build_and_compliance?plate=TEST00&state=VIC&include_nvic=true" -H "Authorization: secret_SANDBOX_f1nlZOh0Xr1JvMgJy0d0l9i5JybnBEAYfl7isuU0_o-1GkBsaN8f"


EXAMPLE RESPONSE

{
  "requested_at": "2025-08-13T00:27:24.161Z",
  "request_id": "721657a0-8448-4489-b1bc-1bf0b400ecb8",
  "result": [
    {
      "vin": "KMHH351EMKU00TEST",
      "chassis": null,
      "registration": {
        "plate": "TEST00",
        "state": "VIC"
      },
      "nvic": "042519",
      "compliance_plate": "2019-07",
      "year_of_manufacture": "2019"
    }
  ]
}

