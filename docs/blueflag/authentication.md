# authentication

(Extracted from api-docs.blueflag.com.au page bundle, 2026-10-16. Text only, order preserved.)

default

Component 

components

Authentication

The Blue Flag API uses API keys to authenticate requests. You can view and manage your API keys in the 

Blue Flag Dashboard

.

Sandbox (test) keys have the prefix 

secret_SANDBOX


and live keys have the prefix 

secret_LIVE

.

Use your API key by setting it as the Authorization header of your https request.

AUTHENTICATED REQUEST

curl "https://sandbox.blueflag.com.au/vin_decoder?vin=KMHH351EMKU00TEST" -H "Authorization: secret_SANDBOX_f1nlZOh0Xr1JvMgJy0d0l9i5JybnBEAYfl7isuU0_o-1GkBsaN8f"


Your API Key

A sample test API key is included in all the examples here, so you can test any example right away.

To test requests using your account, replace the sample API key with your actual API key.

/authentication
