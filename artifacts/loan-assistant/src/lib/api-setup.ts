import { useState, useEffect } from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react/custom-fetch";

// Setup the auth token getter for custom fetch globally
export function setupApi() {
  setAuthTokenGetter(() => {
    return localStorage.getItem("loan_token");
  });
}
