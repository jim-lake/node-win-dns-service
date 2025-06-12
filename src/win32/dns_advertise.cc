#define WIN32_LEAN_AND_MEAN

// start
#include <windows.h>
// has to be second
#include <windns.h>
#pragma comment(lib, "dnsapi.lib")
// done

#include "dns_advertise.h"
#include <map>
#include <string>

static AdvertiseCallback _callback = nullptr;

static std::map<std::u16string, DNS_SERVICE_REGISTER_REQUEST *>
    g_serviceRequestMap;

static void _DnsServiceRegisterComplete(DWORD Status, PVOID pQueryContext,
                                        PDNS_SERVICE_INSTANCE pInstance) {

  if (_callback != nullptr) {
    _callback("register", Status,
              std::u16string(
                  reinterpret_cast<char16_t *>(pInstance->pszInstanceName)));
  } else {
    printf("_DnsServiceRegisterComplete: %d\n", Status);
  }
}
static void _DnsServiceDeRegisterComplete(DWORD Status, PVOID pQueryContext,
                                          PDNS_SERVICE_INSTANCE pInstance) {
  if (_callback != nullptr) {
    _callback("deregister", Status,
              std::u16string(
                  reinterpret_cast<char16_t *>(pInstance->pszInstanceName)));
  } else {
    printf("_DnsServiceDeRegisterComplete: %d\n", Status);
  }
  if (pQueryContext != nullptr) {
    auto request = (DNS_SERVICE_REGISTER_REQUEST *)pQueryContext;
    free(request->pServiceInstance->pszInstanceName);
    free(request->pServiceInstance->pszHostName);
    delete request->pServiceInstance;
    delete request;
  }
}
void SetAdvertiseCallback(AdvertiseCallback func) { _callback = func; }
Result RegisterService(const std::u16string &service_name,
                       const uint16_t port) {
  if (g_serviceRequestMap.find(service_name) != g_serviceRequestMap.end()) {
    return {"already_registered"};
  }

  wchar_t hostname[256];
  DWORD size = _countof(hostname);
  if (!GetComputerNameExW(ComputerNameDnsHostname, hostname, &size)) {
    return {"no_computer_name"};
  }

  std::wstring fqdn = hostname;
  fqdn += L".local";

  auto instance = new DNS_SERVICE_INSTANCE();
  ZeroMemory(instance, sizeof(DNS_SERVICE_INSTANCE));
  instance->pszInstanceName =
      _wcsdup(reinterpret_cast<LPCWSTR>(service_name.c_str()));
  instance->pszHostName = _wcsdup(fqdn.c_str());
  instance->wPort = port;
  instance->wPriority = 0;
  instance->wWeight = 0;
  instance->dwPropertyCount = 0;
  instance->keys = nullptr;
  instance->values = nullptr;

  auto request = new DNS_SERVICE_REGISTER_REQUEST();
  ZeroMemory(request, sizeof(DNS_SERVICE_REGISTER_REQUEST));
  request->Version = DNS_QUERY_REQUEST_VERSION1;
  request->InterfaceIndex = 0;
  request->pServiceInstance = instance;
  request->pRegisterCompletionCallback = &_DnsServiceRegisterComplete;
  request->pQueryContext = request;
  request->hCredentials = nullptr;
  request->unicastEnabled = FALSE;

  DWORD win_result = DnsServiceRegister(request, nullptr);
  if (win_result == DNS_REQUEST_PENDING) {
    g_serviceRequestMap.insert({service_name, request});
  } else {
    const auto last_error = GetLastError();
    free(request->pServiceInstance->pszInstanceName);
    free(request->pServiceInstance->pszHostName);
    delete request->pServiceInstance;
    delete request;
    return {"register_failed", win_result, last_error};
  }
  return {};
}
Result DeRegisterService(const std::u16string &service_name) {
  const auto iter = g_serviceRequestMap.find(service_name);
  if (iter == g_serviceRequestMap.end()) {
    return {"not_found"};
  }
  DNS_SERVICE_REGISTER_REQUEST *request = iter->second;
  g_serviceRequestMap.erase(service_name);
  request->pRegisterCompletionCallback = &_DnsServiceDeRegisterComplete;

  DWORD win_result = DnsServiceDeRegister(request, nullptr);
  if (win_result != DNS_REQUEST_PENDING) {
    const auto last_error = GetLastError();
    free(request->pServiceInstance->pszInstanceName);
    free(request->pServiceInstance->pszHostName);
    delete request->pServiceInstance;
    delete request;
    return {"deregister_failed", win_result, last_error};
  }
  return {};
}
