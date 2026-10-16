# products/NEVDIS/written_off_vehicle

(Extracted from api-docs.blueflag.com.au page bundle, 2026-10-16. Text only, order preserved.)

/products/NEVDIS/written_off_vehicle

default

Component 

components

Written Off Vehicle

Written Off Vehicle Register (WOVR) data is provided by insurance companies to the state road and traffic authority.

Learn More >

Attributes

A unique 17 character code used to identify individual motor vehicles.

chassis

A unique code used to identify individual motor vehicles. Used before January 1989 in Australia.

registration.plate

An alphanumeric code used to identify vehicles. The plate is visible on the front and rear of most vehicles.

registration.state

Area within Australia where the vehicle is registered.

One of: ACT, NSW, NT, QLD, SA, TAS, VIC, WA

written_off.damage_codes

Code dictating the type and location of damage

written_off.incident_code

A statutory write-off indicates the vehicle cannot be repaired whereas a repairable write-off indicates the vehicle can be repaired. This is determined by the insurance company.

One of: Statutory Write-Off or Repairable Write-Off

written_off.incident_recorded_date

string (YYYY-MM-DD)

Date the vehicle was recorded as written-off.

written_off.jurisdiction

State where the vehicle was recorded as written-off.

One of: ACT, NSW, NT, QLD, SA, TAS, VIC, WA

written_off.type_code

Cause of the vehicle damage

Glass's National Vehicle Identification Code (NVIC) is a unique character code used to identify an individual motor vehicle.

This value is only available to Glass's customers. 

Please contact us for futher information if you're interested.

ENDPOINT URL

https://sandbox.blueflag.com.au/nevdis/written_off_check?plate=TEST80&state=VIC&include_nvic=true"


EXAMPLE REQUEST

curl "https://sandbox.blueflag.com.au/nevdis/written_off_check?plate=TEST80&state=VIC&include_nvic=true" -H "Authorization: secret_SANDBOX_f1nlZOh0Xr1JvMgJy0d0l9i5JybnBEAYfl7isuU0_o-1GkBsaN8f"


EXAMPLE RESPONSE

{
  "requested_at": "2025-08-13T00:27:24.161Z",
  "request_id": "61343a9d-3bd5-4792-b5fe-f93ebda2c868",
  "result": [
    {
      "vin": "WAUZZZ8X4GB00TEST",
      "chassis": null,
      "registration": {
        "plate": "TEST80",
        "state": "VIC"
      },
      "nvic": "042519",
      "written_off": [
        {
          "damage_codes": "F14N",
          "incident_code": "Statutory Write-off",
          "incident_recorded_date": "2021-03-02",
          "jurisdiction": "VIC",
          "type_code": "Storm, Flood, Other Write-off"
        }
      ]
    }
  ]
}

