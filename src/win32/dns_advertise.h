#include <string>

typedef void (*AdvertiseCallback)(const std::string reason, const long status,
                                  const std::u16string service_name);

extern void SetAdvertiseCallback(AdvertiseCallback func);

extern int RegisterService(const std::u16string &service_name,
                           const uint16_t port);
extern int DeRegisterService(const std::u16string &service_name);
