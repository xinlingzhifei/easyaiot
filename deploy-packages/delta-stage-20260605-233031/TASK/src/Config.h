//
// Created by basiclab on 25-10-15.
//

#ifndef CONFIG_H
#define CONFIG_H

#include <map>
#include <string>
#include <vector>

#include <opencv2/opencv.hpp>

typedef struct Config {
    std::string rtspUrl;
    std::string rtmpUrl;
    std::string hookHttpUrl;

    bool enableRtmp{false};
    bool enableAI{false};
    bool enableDrawRtmp{true};
    bool enableAlarm{false};
    bool headless{false};

    std::map<std::string, std::string> modelPaths;
    std::map<std::string, std::string> modelClasses;
    std::map<std::string, std::vector<std::vector<cv::Point>>> regions;
    int threadNums{3};

    int videoWidth{1920};
    int videoHeight{1080};
    int rtmpFps{25};

    float alarmConfidenceThreshold{0.6f};
    int alarmCooldownTime{30};

    std::string taskId;
    int controlPort{0};
} Config;

#endif // CONFIG_H
