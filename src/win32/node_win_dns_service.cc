#define WIN32_LEAN_AND_MEAN

#include <napi.h>
#include <windows.h>

using namespace Napi;

Value Advertise(const Napi::CallbackInfo &info) {
  const Napi::Env env = info.Env();
  Value ret = env.Null();

  if (info.Length() != 2) {
    ret = String::New(env, "Expected 2 arguments");
  } else if (!info[0].IsString()) {
    ret = String::New(env, "Expected string arg 0");
  } else if (!info[1].IsFunction()) {
    ret = String::New(env, "Expected function arg 1");
  } else {
    const auto path = info[0].As<String>();
    const auto cb = info[1].As<Function>();
  }
  return ret;
}
Object Init(Napi::Env env, Object exports) {
  exports.Set("advertise", Function::New(env, Advertise));
  return exports;
}
NODE_API_MODULE(NODE_GYP_MODULE_NAME, Init)
