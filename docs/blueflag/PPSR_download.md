# products/PPSR/download

(Extracted from api-docs.blueflag.com.au page bundle, 2026-10-16. Text only, order preserved.)

default

Component 

components

Download Certificate

Download PPSR Certificate by Search Number.

Sample Certificate >

Attributes

search_number

The Search Number of the search.

ENDPOINT URL

https://sandbox.blueflag.com.au/afsa/ppsr/download?search_number=111111111111


EXAMPLE REQUEST

curl "https://sandbox.blueflag.com.au/afsa/ppsr/download?search_number=111111111111" -H "Authorization: secret_SANDBOX_f1nlZOh0Xr1JvMgJy0d0l9i5JybnBEAYfl7isuU0_o-1GkBsaN8f"


EXAMPLE RESPONSE

{
    "result": {
        "download_url": "https://downloaded-files-sandbox.s3.ap-southeast-2.amazonaws.com/afsa/ppsr/sandbox/TEST00_VIC.pdf"
    }
}


/products/PPSR/download
