#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// WiFi Configuration
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// API Configuration
const char* serverUrl = "http://YOUR_SERVER_IP:5000/api/bracelet/data";
const char* braceletApiKey = "bracelet-secret-key";
const char* deviceId = "BRACELET_001";

// Mock Sensor Variables (already working on your end)
int beatAvg = 75;
int spo2Value = 98;
int stepCount = 0;
int lastStepCount = 0;

unsigned long lastUpdate = 0;
const long interval = 5000; // 5 seconds

void setup() {
  Serial.begin(115200);
  
  // WiFi Connection
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConnected to WiFi");
}

void loop() {
  if (millis() - lastUpdate >= interval) {
    lastUpdate = millis();
    
    // Auto-detect activity from stepCount
    String activity = "resting";
    int stepsInLast5s = stepCount - lastStepCount;
    if (stepsInLast5s > 10) {
      activity = "active";
    } else if (stepsInLast5s > 0) {
      activity = "walking";
    }
    lastStepCount = stepCount;

    // Prepare JSON payload
    StaticJsonDocument<200> doc;
    doc["device_id"] = deviceId;
    doc["heartRate"] = beatAvg;
    doc["spo2"] = spo2Value;
    doc["steps"] = stepCount;
    doc["activity"] = activity;

    String jsonPayload;
    serializeJson(doc, jsonPayload);

    // Send POST request
    if (WiFi.status() == WL_CONNECTED) {
      HTTPClient http;
      http.begin(serverUrl);
      http.addHeader("Content-Type", "application/json");
      http.addHeader("x-api-key", braceletApiKey);

      int httpResponseCode = http.POST(jsonPayload);

      if (httpResponseCode > 0) {
        String response = http.getString();
        Serial.println("HTTP Response code: " + String(httpResponseCode));
        Serial.println(response);
      } else {
        Serial.print("Error code: ");
        Serial.println(httpResponseCode);
      }
      http.end();
    } else {
      Serial.println("WiFi Disconnected");
    }

    // Mock sensor updates for testing
    beatAvg = 70 + random(0, 20);
    spo2Value = 95 + random(0, 5);
    stepCount += random(0, 15);
  }
}
