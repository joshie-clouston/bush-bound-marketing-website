# products/NEVDIS/registration_status

(Extracted from api-docs.blueflag.com.au page bundle, 2026-10-16. Text only, order preserved.)

components

Registration Status

The current status of a vehicle's registration.

Attributes

A unique 17 character code used to identify individual motor vehicles.

chassis

A unique code used to identify individual motor vehicles. Used before January 1989 in Australia.

registration.plate

An alphanumeric code used to identify vehicles. The plate is visible on the front and rear of most vehicles.

registration.state

The area within Australia where the vehicle is registered.

One of: ACT, NSW, NT, QLD, SA, TAS, VIC, WA

registration.status

Can be either Registered, Unregistered or Suspended.

registration.expiry_date

string (YYYY-MM-DD)

Status and expiry date update when registration is paid / cancelled or lapsed. Some states update within 1 hour while others update overnight.

Glass's National Vehicle Identification Code (NVIC) is a unique character code used to identify an individual motor vehicle.

This value is only available to Glass's customers. 

Please contact us for futher information if you're interested.

ENDPOINT URL

https://sandbox.blueflag.com.au/nevdis/registration_status?plate=TEST00&state=VIC&include_nvic=true"


EXAMPLE REQUEST

curl "https://sandbox.blueflag.com.au/nevdis/registration_status?plate=TEST00&state=VIC&include_nvic=true" -H "Authorization: secret_SANDBOX_f1nlZOh0Xr1JvMgJy0d0l9i5JybnBEAYfl7isuU0_o-1GkBsaN8f"


EXAMPLE RESPONSE

{
  "requested_at": "2025-08-13T00:27:24.161Z",
  "request_id": "acc0e116-3e15-4910-ada7-6367b62e60ed",
  "result": [
    {
      "vin": "KMHH351EMKU00TEST",
      "chassis": null,
      "registration": {
        "plate": "TEST00",
        "state": "VIC",
        "status": "REGISTERED",
        "expiry_date": "2022-01-16"
      },
      "nvic": "042519"
    }
  ]
}


/products/NEVDIS/registration_status

U+x0
