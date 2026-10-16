# products/NEVDIS/stolen_check

(Extracted from api-docs.blueflag.com.au page bundle, 2026-10-16. Text only, order preserved.)

components

Stolen Check

Stolen vehicle data is provided by the police to the state road and traffic authority.

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

stolen.type

Part of the vehicle that is stolen.

One of: VIN, Engine, Plate

stolen.jurisdiction

State where the vehicle was reported stolen.

One of: ACT, NSW, NT, QLD, SA, TAS, VIC, WA

stolen.reported_date

string (YYYY-MM-DD)

Date the vehicle was reported as stolen.

stolen.summary

Police jurisdiction reference number.

Glass's National Vehicle Identification Code (NVIC) is a unique character code used to identify an individual motor vehicle.

This value is only available to Glass's customers. 

Please contact us for futher information if you're interested.

ENDPOINT URL

https://sandbox.blueflag.com.au/nevdis/stolen_check?plate=TEST80&state=VIC&include_nvic=true"


EXAMPLE REQUEST

curl "https://sandbox.blueflag.com.au/nevdis/stolen_check?plate=TEST80&state=VIC&include_nvic=true" -H "Authorization: secret_SANDBOX_f1nlZOh0Xr1JvMgJy0d0l9i5JybnBEAYfl7isuU0_o-1GkBsaN8f"


EXAMPLE RESPONSE

{
  "requested_at": "2025-08-13T00:27:24.161Z",
  "request_id": "5e8fbb2e-129f-41de-851c-b4315f324678",
  "result": [
    {
      "vin": "WAUZZZ8X4GB00TEST",
      "chassis": null,
      "registration": {
        "plate": "TEST80",
        "state": "VIC"
      },
      "nvic": "042519",
      "stolen": [
        {
          "type": "Plate",
          "jurisdiction": "VIC",
          "reported_date": "2021-02-21",
          "summary": "POL JUR-N REF-00789042100033645052"
        }
      ]
    }
  ]
}

