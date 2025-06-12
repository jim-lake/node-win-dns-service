#pragma once
#include <string>
#include <vector>

#include "dns_advertise.h"

struct BrowseRecord {
  std::u16string name;
  std::string type;
  int ttl;
  int port;
  std::u16string data;
};
typedef void (*BrowserCallback)(const std::string reason,
                                const std::vector<BrowseRecord> records);

extern void SetBrowserCallback(BrowserCallback func);
extern Result StartBrowser(const std::u16string &service_name);
extern Result StopBrowser(const std::u16string &service_name);
