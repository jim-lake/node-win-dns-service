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

struct StringVectorResult {
  Napi::Error error;
  std::vector<std::u16string> array;
};
static StringVectorResult _convertVectorString(const Napi::Env &env,
                                               const Napi::Value &value) {
  StringVectorResult result;
  if (!value.IsArray()) {
    result.error = Napi::TypeError::New(env, "Expected an array of strings");
    return result;
  }
  Napi::Array inputArray = value.As<Napi::Array>();
  uint32_t length = inputArray.Length();
  result.array.reserve(length);

  for (uint32_t i = 0; i < length; ++i) {
    Napi::Value element = inputArray[i];
    if (!element.IsString()) {
      result.error = Napi::TypeError::New(env, "All elements must be strings");
      return result;
    }
    result.array.push_back(element.As<Napi::String>());
  }
  return result;
}

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
  if (info.Length() != 1) {
    Error::New(env, "Expected 1 arguments").ThrowAsJavaScriptException();
  } else if (!info[0].IsFunction()) {
    Error::New(env, "Expected function arg 1").ThrowAsJavaScriptException();
  } else {
    Function cb = info[0].As<Function>();
    g_tsfn = ThreadSafeFunction::New(env, cb, "DNS Service Callback", 0, 1);
    SetAdvertiseCallback(_advertiseCallback);
    SetBrowserCallback(_browseCallback);
  }
  return env.Null();
}
Value Register(const CallbackInfo &info) {
  const Env env = info.Env();
  if (info.Length() != 4) {
    Error::New(env, "Expected 2 arguments").ThrowAsJavaScriptException();
  } else if (!info[0].IsString()) {
    Error::New(env, "Expected string arg 0").ThrowAsJavaScriptException();
  } else if (!info[1].IsNumber()) {
    Error::New(env, "Expected number arg 1").ThrowAsJavaScriptException();
  } else if (!info[2].IsArray()) {
    Error::New(env, "Expected array arg 2").ThrowAsJavaScriptException();
  } else if (!info[3].IsArray()) {
    Error::New(env, "Expected array arg 3").ThrowAsJavaScriptException();
  } else {
    const auto service_name = info[0].As<String>();
    const auto port = info[1].As<Number>();
    const auto key_result = _convertVectorString(env, info[2]);
    const auto value_result = _convertVectorString(env, info[2]);

    if (!key_result.error.IsEmpty()) {
      key_result.error.ThrowAsJavaScriptException();
    } else if (!value_result.error.IsEmpty()) {
      value_result.error.ThrowAsJavaScriptException();
    } else if (value_result.array.size() != key_result.array.size()) {
      Error::New(env, "keys and values must has same size")
          .ThrowAsJavaScriptException();
    } else {
      const auto result = RegisterService(service_name, port.Int32Value(),
                                          key_result.array, value_result.array);
      if (result.error.length() > 0) {
        auto err = Napi::Error::New(env, result.error);
        err.Set("errno", Number::New(env, result.win_error));
        err.Set("last_error", Number::New(env, result.last_error));
        err.ThrowAsJavaScriptException();
      }
    }
  }
  return env.Null();
}
Value DeRegister(const CallbackInfo &info) {
  const Env env = info.Env();
  if (info.Length() != 1) {
    Error::New(env, "Expected 1 arguments").ThrowAsJavaScriptException();
  } else if (!info[0].IsString()) {
    Error::New(env, "Expected string arg 0").ThrowAsJavaScriptException();
  } else {
    const auto service_name = info[0].As<String>();
    const auto result = DeRegisterService(service_name);
    if (result.error.length() > 0) {
      auto err = Napi::Error::New(env, result.error);
      err.Set("errno", Number::New(env, result.win_error));
      err.Set("last_error", Number::New(env, result.last_error));
      err.ThrowAsJavaScriptException();
    }
  }
  return env.Null();
}
Value Browse(const CallbackInfo &info) {
  const Env env = info.Env();
  if (info.Length() != 1) {
    Error::New(env, "Expected 1 arguments").ThrowAsJavaScriptException();
  } else if (!info[0].IsString()) {
    Error::New(env, "Expected string arg 0").ThrowAsJavaScriptException();
  } else {
    const auto service_name = info[0].As<String>();
    const std::wstring name((wchar_t *)std::u16string(service_name).c_str());
    const auto result = StartBrowser(service_name);
    if (result.error.length() > 0) {
      auto err = Napi::Error::New(env, result.error);
      err.Set("errno", Number::New(env, result.win_error));
      err.Set("last_error", Number::New(env, result.last_error));
      err.ThrowAsJavaScriptException();
    }
  }
  return env.Null();
}
Value StopBrowse(const CallbackInfo &info) {
  const Env env = info.Env();
  if (info.Length() != 1) {
    Error::New(env, "Expected 1 arguments").ThrowAsJavaScriptException();
  } else if (!info[0].IsString()) {
    Error::New(env, "Expected string arg 0").ThrowAsJavaScriptException();
  } else {
    const auto service_name = info[0].As<String>();
    const std::wstring name((wchar_t *)std::u16string(service_name).c_str());
    const auto result = StopBrowser(service_name);
    if (result.error.length() > 0) {
      auto err = Napi::Error::New(env, result.error);
      err.Set("errno", Number::New(env, result.win_error));
      err.Set("last_error", Number::New(env, result.last_error));
      err.ThrowAsJavaScriptException();
    }
  }
  return env.Null();
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
