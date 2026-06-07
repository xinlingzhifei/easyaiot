const n=`syntax ="proto3";
package telemetry;

message SensorDataReading {

  optional double temperature = 1;
  optional double humidity = 2;
  InnerObject innerObject = 3;

  message InnerObject {
    optional string key1 = 1;
    optional bool key2 = 2;
    optional double key3 = 3;
    optional int32 key4 = 4;
    optional string key5 = 5;
  }
}
`,e=`syntax ="proto3";
package attributes;

message SensorConfiguration {
  optional string firmwareVersion = 1;
  optional string serialNumber = 2;
}`,t=`syntax ="proto3";
package rpc;

message RpcRequestMsg {
  optional string method = 1;
  optional int32 requestId = 2;
  optional string params = 3;
}`,a=`syntax ="proto3";
package rpc;

message RpcResponseMsg {
  optional string payload = 1;
}`;export{e as a,t as b,a as c,n as d};
