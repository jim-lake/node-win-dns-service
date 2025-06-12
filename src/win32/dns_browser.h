#include <string>
#include <vector>

struct BrowseRecord {
  std::u16string name;
  int port;
  std::string type;
  std::u16string data;
};
typedef void (*BrowserCallback)(const std::string reason,
                                const std::vector<BrowseRecord> records);

extern void SetBrowserCallback(BrowserCallback func);
extern int StartBrowser(const std::u16string &service_name);
extern int StopBrowser(const std::u16string &service_name);
