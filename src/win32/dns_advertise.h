#pragma once
#include <string>
#include <vector>

struct Result {
  std::string error;
  unsigned long win_error;
  unsigned long last_error;
};
typedef void (*AdvertiseCallback)(const std::string reason, const long status,
                                  const std::u16string service_name);

extern void SetAdvertiseCallback(AdvertiseCallback func);

extern Result RegisterService(const std::u16string &service_name,
                              const uint16_t port,
                              const std::vector<std::u16string> keys,
                              const std::vector<std::u16string> values);
extern Result DeRegisterService(const std::u16string &service_name);
