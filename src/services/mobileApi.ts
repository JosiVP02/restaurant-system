import axios from "axios";

export function getMobileServer() {
  return localStorage.getItem("poskey_server") || "";
}

export function setMobileServer(url: string) {
  localStorage.setItem("poskey_server", url.replace(/\/$/, ""));
}

export const mobileApi = axios.create({
  baseURL: getMobileServer(),
});

export function recargarMobileApi() {
  mobileApi.defaults.baseURL = getMobileServer();
}