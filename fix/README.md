# oci-sdk typescript fix

This folder includes oci-sdk files to fix an issue with remix (or react, or node?).
When used with Remix, the Instance Principal authentication fails - after long investigations it seems to come from the http request to retrieve the certificates: within the application it returns a StreamReadable and not a readable.
The file helper.js, which reads the http body only accept __string__ or __readable__.
I updated two files so they can work with **oci-sdk** version 2.40.0:

* oci-common/lib/helper.js
* oci-common/lib/auth/url-based-x509-certificate-supplier.js

Those files need to replace the standard one after running `npm install`

```shell
  cp fix/helper.js node_modules/oci-common/lib
  cp fix/url-based-x509-certificate-supplier.js node_modules/oci-common/lib/auth/
```

