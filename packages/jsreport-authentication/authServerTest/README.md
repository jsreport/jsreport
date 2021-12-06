## Authorization Server Test

This server is used to test the following:

- Single sign on integration with jsreport studio against an external authorization server
- Token based authentication in jsreport api calls, when tokens are handle and issued by external authorization server

## General

In order to start testing, you need to do two things first:

- From the monorepo root, start the Authorization server with `yarn workspace @jsreport/jsreport-authentication start-auth-server`, by default it will start on port `5000` but it can be changed [here](./startAuthServer.js), just make sure that if you change the port you need to also change the references to that port in the jsreport configuration `extensions.authentication.authorizationServer.issuer`, `extensions.authentication.authorizationServer.endpoints`
- Start jsreport on port `5488` with authentication enabled and with the following extra configuration
  ```js
  {
    // rest of config here
    "extensions": {
      "authentication": {
        "cookieSession": {
          "secret": "secret"
        },
        "admin": {
          "username": "admin",
          "password": "password"
        },
        "authorizationServer": {
          "name": "AuthServer",
          "issuer": "http://localhost:5000",
          "endpoints": {
            "jwks": "http://localhost:5000/.well-known/openid-configuration/jwks",
            "authorization": "http://localhost:5000/connect/authorize",
            "token": "http://localhost:5000/connect/token",
            "introspection": "http://localhost:5000/connect/introspect",
            "userinfo": "http://localhost:5000/connect/userinfo"
          },
          "studioClient": {
            "clientId": "jsreport-studio",
            "clientSecret": "secret"
          },
          "apiResource": {
            "clientId": "jsreport-api",
            "clientSecret": "secret"
          },
          "authorizationRequest": {
            "scope": ["jsreport", "authProfile"]
          }
        },
        "enabled": true
      }
    }
  }
  ```
  If for some reason you need to start jsreport on different port, make sure to edit the port part of the `studioClient.redirectUri` [here](./startAuthServer.js)

Ignore any warnings in the console of the Authorization server, those come from [oidc-provider](https://github.com/panva/node-oidc-provider). such logs are there to remember you that you are using a server just for development.

The main points to highlight about the jsreport configuration related to authorization server are:

- `extensions.authentication.authorizationServer.endpoints` - This is needed in order for the jsreport to know which routes to call for the different kind of tasks (user authorization, token generation, token validation, getting user information associated with a token) involved with the authorization server
- `extensions.authentication.authorizationServer.studioClient` - This contains the credentials that the jsreport studio is going to use to identify itself against the authorization server, mostly used when doing the [Single Sign On with jsreport studio](#single-sign-on-with-jsreport-studio-test). it is expected that jsreport studio is already registered in the authorization server as a client (like it is the case in this demo)
- `extensions.authentication.authorizationServer.apiResource` - This contains the credentials that the jsreport api is going to use to identify itself against the authorization server, mostly used when doing the [Token based authentication](#token-based-authentication-test). it is expected that jsreport api is already registered in the authorization server as a resource/resource api

## Single Sign On with jsreport studio Test

Open jsreport at http://localhost:5488/, you will see the standard login screen but now there will be an extra button "LOGIN WITH AUTHSERVER", when you click that you will be redirected to the authorization server, there you will need to login.

The Authorization server is configured to make any username as valid, but for the purpose of our test we need to use `admin` (because it needs to match an existing jsreport username), as password we can put any value, the login will pass normally no matter which password we use. We can use `guser` or `guser2` (login with `guser2` will give you a custom username display on studio) as users if we want to test a login flow based on groups, we just need to ensure that a users group `g1` exists on jsreport.

After the login succeed we will now see a page in which we will give our consent/authorization, this basically tells the user that jsreport studio is going to access some specific information from its account. when the consent is finished (by clicking "Continue") we are now going to be redirected to the jsreport studio again, this time we are going to have an active session with the user `admin`. Internally the studio creates a session after getting successfully response from authorization server, this session is basically the same like if user were authenticating directly with its jsreport credentials in the studio login page, so any action the user does in studio from now should work the same.

If after refreshing the page, rendering a few times and checking the entities you have access in the studio are the correct ones, then the test can be considered done and everything is working as expected.

## Token based authentication Test

For this test we are going to need a token issued by the authorization server. The easy way to get this token is by repeating the login from the [Single Sign On with jsreport studio Test](#single-sign-on-with-jsreport-studio-test) and get the token from the console in which the authorization server is running.

Open jsreport at http://localhost:5488/, go and click "LOGIN WITH AUTHSERVER", if you have an active session with the authorization server then this will just redirect you back to the studio, if not the authorization server is going to ask for your login and consent again, just remember to complete that step using `admin` as the user, or `guser`, `guser2` users if want to test the flow against the group.

When you are again in jsreport studio as an authenticated user, go to the console in which the Authorization server is running and check the last lines, you should see a log similar to `NEW access_token "xxxxxxxxxxxxxxxx" saved AccessToken {...}`. what it is between the quotation marks is the token, so make sure to copy that.

Now we need to execute a request against the jsreport api in order to test that this token works. The easy way to do this is by using [Postman](https://www.postman.com/), open it and execute this request.

```
POST http://localhost:5488/api/report

Authorization: Bearer <token we get from the console>
Content-Type: application/json

{
  "template": {
    "shortid": "<any template you have in the jsreport instance>"
  }
}
```

The request is going to success if the token was validated correctly. Additionally we can execute these requests against the Authorization server in order to check the results of token validation and user information.

> Token validation
```
POST http://localhost:5000/connect/introspect

Authorization: Basic <api resource credentials>
Content-Type: application/x-www-form-urlencoded

token=<token we get from the console>
token_type_hint=access_token
```

> User info
```
GET http://localhost:5000/connect/userinfo

Authorization: Bearer <token we get from the console>
```

If all the requests at this point works, then the test can be considered done and everything is working as expected.
