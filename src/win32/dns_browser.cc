#define WIN32_LEAN_AND_MEAN

// start
#include <windows.h>
// has to be second
#include <windns.h>
#pragma comment(lib, "dnsapi.lib")
#include <ws2tcpip.h>
#pragma comment(lib, "Ws2_32.lib")
// done
#include "dns_browser.h"
#include <iostream>
#include <map>

static std::map<std::u16string, DNS_SERVICE_CANCEL *> g_cancelMap;

BrowserCallback _callback = nullptr;

static std::u16string _ip6ToString(const IP6_ADDRESS &ip6) {
  WCHAR buffer[INET6_ADDRSTRLEN] = {0};
  const auto addr = reinterpret_cast<const IN6_ADDR *>(&ip6);
  if (InetNtopW(AF_INET6, addr, buffer, INET6_ADDRSTRLEN)) {
    return std::u16string((char16_t *)buffer);
  } else {
    return std::u16string();
  }
}
static std::u16string _ip4ToString(const IP4_ADDRESS &ip4) {
  WCHAR buffer[INET_ADDRSTRLEN] = {0};
  if (InetNtopW(AF_INET, &ip4, buffer, INET_ADDRSTRLEN)) {
    return std::u16string((char16_t *)buffer);
  } else {
    return std::u16string();
  }
}
static void _DnsQueryCompletionRoutine(PVOID pQueryContext,
                                       PDNS_QUERY_RESULT pQueryResults) {
  if (pQueryResults->QueryStatus == ERROR_CANCELLED) {
    return;
  }
  if (_callback != nullptr) {
    std::vector<BrowseRecord> records;
    auto record = (PDNS_RECORDW)pQueryResults->pQueryRecords;
    while (record != nullptr) {
      if (record->wType == DNS_TYPE_A) {
        records.emplace_back((char16_t *)record->pName, "A", record->dwTtl, 0,
                             _ip4ToString(record->Data.A.IpAddress));
      } else if (record->wType == DNS_TYPE_AAAA) {
        records.emplace_back((char16_t *)record->pName, "AAAA", record->dwTtl,
                             0, _ip6ToString(record->Data.AAAA.Ip6Address));
      } else if (record->wType == DNS_TYPE_PTR) {
        records.emplace_back((char16_t *)record->pName, "PTR", record->dwTtl, 0,
                             (char16_t *)record->Data.PTR.pNameHost);
      } else if (record->wType == DNS_TYPE_SRV) {
        records.emplace_back((char16_t *)record->pName, "SRV", record->dwTtl,
                             record->Data.SRV.wPort,
                             (char16_t *)record->Data.SRV.pNameTarget);
      }
      record = record->pNext;
    }
    _callback("browse", records);
  } else {
    printf("_DnsQueryCompletionRoutine: no callback\n");
  }
  if (pQueryResults->pQueryRecords != nullptr) {
    DnsRecordListFree(pQueryResults->pQueryRecords, DnsFreeRecordList);
  }
}
void SetBrowserCallback(BrowserCallback func) { _callback = func; }
int StartBrowser(const std::u16string &service_name) {
  if (g_cancelMap.find(service_name) != g_cancelMap.end()) {
    return -1;
  }

  DNS_SERVICE_BROWSE_REQUEST request;
  request.Version = DNS_QUERY_REQUEST_VERSION2;
  request.InterfaceIndex = 0;
  request.QueryName = (LPWSTR)service_name.c_str();
  request.pBrowseCallbackV2 = &_DnsQueryCompletionRoutine;
  request.pQueryContext = nullptr;

  auto cancel = new DNS_SERVICE_CANCEL();
  ZeroMemory(cancel, sizeof(DNS_SERVICE_CANCEL));

  const auto ret = DnsServiceBrowse(&request, cancel);
  if (ret != DNS_REQUEST_PENDING) {
    const auto last_error = GetLastError();
    delete cancel;
    return last_error || ret || -2;
  } else {
    g_cancelMap.insert({service_name, cancel});
  }
  return 0;
}
int StopBrowser(const std::u16string &service_name) {
  const auto iter = g_cancelMap.find(service_name);
  if (iter == g_cancelMap.end()) {
    return -1;
  }
  DNS_SERVICE_CANCEL *cancel = iter->second;
  g_cancelMap.erase(service_name);
  const auto ret = DnsServiceBrowseCancel(cancel);
  if (ret != ERROR_SUCCESS) {
    const auto last_error = GetLastError();
    delete cancel;
    return last_error || ret || -2;
  } else {
    delete cancel;
  }
  return 0;
}
