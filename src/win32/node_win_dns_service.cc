#include "dns_advertise.h"
#include "dns_browser.h"
#include <napi.h>

using namespace Napi;

struct CallbackParams {
  std::string reason;
  long status;
  std::u16string service_name;
  std::vector<BrowseRecord> records;
};

static ThreadSafeFunction g_tsfn = NULL;

static auto napiCallback = [](Env env, Function cb, CallbackParams *params) {
  const auto records = Array::New(env);
  for (auto record : params->records) {
    const auto obj = Object::New(env);
    obj.Set("name", String::New(env, record.name));
    obj.Set("type", String::New(env, record.type));
    obj.Set("ttl", Number::New(env, record.ttl));
    obj.Set("port", Number::New(env, record.port));
    obj.Set("data", String::New(env, record.data));
    records.Set(records.Length(), obj);
  }
  cb.Call({String::New(env, params->reason), Number::New(env, params->status),
           String::New(env, params->service_name), records});
  delete params;
};
void _advertiseCallback(const std::string reason, const long status,
                        const std::u16string service_name) {
  if (g_tsfn != NULL) {
    const auto param = new CallbackParams{reason, status, service_name, {}};
    g_tsfn.BlockingCall(param, napiCallback);
  } else {
    printf("_advertiseCallback: No threadsafefunction available!\n");
  }
}
void _browseCallback(const std::string reason,
                     const std::vector<BrowseRecord> records) {
  if (g_tsfn != NULL) {
    const auto param = new CallbackParams{reason, 0, u"", records};
    g_tsfn.BlockingCall(param, napiCallback);
  } else {
    printf("_browseCallback: No threadsafefunction available!\n");
  }
}
Value Setup(const Napi::CallbackInfo &info) {
  const Napi::Env env = info.Env();
  Value ret = env.Null();

  if (info.Length() != 1) {
    ret = String::New(env, "Expected 1 arguments");
  } else if (!info[0].IsFunction()) {
    ret = String::New(env, "Expected function arg 1");
  } else {
    Function cb = info[0].As<Function>();
    g_tsfn = ThreadSafeFunction::New(env, cb, "DNS Service Callback", 0, 1);
    SetAdvertiseCallback(_advertiseCallback);
    SetBrowserCallback(_browseCallback);
  }
  return ret;
}
Value Register(const CallbackInfo &info) {
  const Env env = info.Env();
  Value ret = env.Null();

  if (info.Length() != 2) {
    ret = String::New(env, "Expected 2 arguments");
  } else if (!info[0].IsString()) {
    ret = String::New(env, "Expected string arg 0");
  } else if (!info[1].IsNumber()) {
    ret = String::New(env, "Expected number arg 1");
  } else {
    const auto service_name = info[0].As<String>();
    const auto port = info[1].As<Number>();
    const auto result = RegisterService(service_name, port.Int32Value());
    if (result != 0) {
      ret = Number::New(env, result);
    }
  }
  return ret;
}
Value DeRegister(const CallbackInfo &info) {
  const Env env = info.Env();
  Value ret = env.Null();

  if (info.Length() != 1) {
    ret = String::New(env, "Expected 1 arguments");
  } else if (!info[0].IsString()) {
    ret = String::New(env, "Expected string arg 0");
  } else {
    const auto service_name = info[0].As<String>();
    const auto result = DeRegisterService(service_name);
    if (result != 0) {
      ret = Number::New(env, result);
    }
  }
  return ret;
}
Value Browse(const CallbackInfo &info) {
  const Env env = info.Env();
  Value ret = env.Null();

  if (info.Length() != 1) {
    ret = String::New(env, "Expected 1 arguments");
  } else if (!info[0].IsString()) {
    ret = String::New(env, "Expected string arg 0");
  } else {
    const auto service_name = info[0].As<String>();
    const std::wstring name((wchar_t *)std::u16string(service_name).c_str());
    const auto result = StartBrowser(service_name);
    if (result != 0) {
      ret = Number::New(env, result);
    }
  }
  return ret;
}
Value StopBrowse(const CallbackInfo &info) {
  const Env env = info.Env();
  Value ret = env.Null();

  if (info.Length() != 1) {
    ret = String::New(env, "Expected 1 arguments");
  } else if (!info[0].IsString()) {
    ret = String::New(env, "Expected string arg 0");
  } else {
    const auto service_name = info[0].As<String>();
    const std::wstring name((wchar_t *)std::u16string(service_name).c_str());
    const auto result = StopBrowser(service_name);
    if (result != 0) {
      ret = Number::New(env, result);
    }
  }
  return ret;
}
Object Init(Env env, Object exports) {
  exports.Set("setup", Function::New(env, Setup));
  exports.Set("register", Function::New(env, Register));
  exports.Set("deregister", Function::New(env, DeRegister));
  exports.Set("browse", Function::New(env, Browse));
  exports.Set("stopBrowse", Function::New(env, StopBrowse));
  return exports;
}
NODE_API_MODULE(NODE_GYP_MODULE_NAME, Init)
