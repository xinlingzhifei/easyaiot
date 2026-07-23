cmake_minimum_required(VERSION 3.5)

project(TASK)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

option(BUILD_TASK_RUNTIME "Build the single-camera TASK runtime" ON)
option(BUILD_TASK_MANAGER "Build the TaskManager HTTP service" ON)

if(WIN32)
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} /std:c++17")
else()
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -std=c++17 -pthread")
endif()

if(NOT CMAKE_BUILD_TYPE)
    set(CMAKE_BUILD_TYPE Debug CACHE STRING "Build type" FORCE)
endif()

if(MSVC)
    set(CMAKE_CXX_FLAGS_DEBUG "${CMAKE_CXX_FLAGS_DEBUG} /W4 /Zi")
    set(CMAKE_CXX_FLAGS_RELEASE "${CMAKE_CXX_FLAGS_RELEASE} /O2 /W4")
    add_compile_options("$<$<C_COMPILER_ID:MSVC>:/utf-8>")
    add_compile_options("$<$<CXX_COMPILER_ID:MSVC>:/utf-8>")
else()
    set(CMAKE_CXX_FLAGS_DEBUG "$ENV{CXXFLAGS} -O0 -Wall -g2 -ggdb")
    set(CMAKE_CXX_FLAGS_RELEASE "$ENV{CXXFLAGS} -O3 -Wall")
endif()

function(configure_jsoncpp)
    if(WIN32)
        find_package(jsoncpp CONFIG QUIET)
        if(TARGET jsoncpp_lib)
            set(JSONCPP_LINK_TARGET jsoncpp_lib PARENT_SCOPE)
            set(JSONCPP_INCLUDE_DIR "" PARENT_SCOPE)
            return()
        endif()
        if(TARGET JsonCpp::JsonCpp)
            set(JSONCPP_LINK_TARGET JsonCpp::JsonCpp PARENT_SCOPE)
            set(JSONCPP_INCLUDE_DIR "" PARENT_SCOPE)
            return()
        endif()
    endif()

    find_path(JSONCPP_INCLUDE_DIR
        NAMES json/json.h
        PATHS
            /usr/include/jsoncpp
            /usr/local/include/jsoncpp
            /usr/include
            /usr/local/include
        REQUIRED
    )
    find_library(JSONCPP_LIBRARY
        NAMES jsoncpp libjsoncpp.so.25 libjsoncpp.so.1.9.5
        PATHS /usr/lib /usr/lib/x86_64-linux-gnu /lib /lib/x86_64-linux-gnu /usr/local/lib
        REQUIRED
    )
    set(JSONCPP_LINK_TARGET ${JSONCPP_LIBRARY} PARENT_SCOPE)
    set(JSONCPP_INCLUDE_DIR ${JSONCPP_INCLUDE_DIR} PARENT_SCOPE)
endfunction()

if(BUILD_TASK_MANAGER)
    add_executable(TaskManager
        src/TaskManagerMain.cpp
        src/TaskManager.cpp
        src/SimpleJson.cpp
    )

    target_include_directories(TaskManager PRIVATE
        ${CMAKE_SOURCE_DIR}/src
        ${CMAKE_SOURCE_DIR}/3rdparty/cpp-httplib
    )

    if(WIN32)
        target_link_libraries(TaskManager PRIVATE ws2_32)
    else()
        target_link_libraries(TaskManager PRIVATE pthread)
    endif()
endif()

if(BUILD_TASK_RUNTIME)
    find_package(OpenCV REQUIRED COMPONENTS core imgproc highgui videoio dnn)
    find_package(CURL REQUIRED)
    configure_jsoncpp()

    message(STATUS "OpenCV: ${OpenCV_INCLUDE_DIRS}")
    message(STATUS "OpenCV version: ${OpenCV_VERSION}")

    if(WIN32)
        find_package(glog REQUIRED)
        find_library(AVCODEC_LIBRARY avcodec REQUIRED)
        find_library(AVFORMAT_LIBRARY avformat REQUIRED)
        find_library(AVUTIL_LIBRARY avutil REQUIRED)
        find_library(SWSCALE_LIBRARY swscale REQUIRED)

        set(PYTHON_ONNXRUNTIME "G:/anaconda/envs/yfeieye/Lib/site-packages/onnxruntime")
        set(VCPKG_ROOT "F:/EASYLOT/vcpkg-master/installed/x64-windows")

        link_directories(
            ${PYTHON_ONNXRUNTIME}/capi
            ${VCPKG_ROOT}/lib
        )
    else()
        find_library(GLOG_LIBRARY
            NAMES glog libglog.so.1 libglog.so.0.6.0
            PATHS /usr/lib /usr/lib/x86_64-linux-gnu /lib /lib/x86_64-linux-gnu
            REQUIRED
        )
        find_library(INIH_LIBRARY
            NAMES inih libinih.so.1 libinih.so.55
            PATHS /usr/lib /usr/lib/x86_64-linux-gnu /lib /lib/x86_64-linux-gnu
            REQUIRED
        )
        find_library(PUGIXML_LIBRARY
            NAMES pugixml libpugixml.so.1 libpugixml.so.1.14
            PATHS /usr/lib /usr/lib/x86_64-linux-gnu /lib /lib/x86_64-linux-gnu
            REQUIRED
        )
    endif()

    file(GLOB Src_SOURCES ${CMAKE_SOURCE_DIR}/src/*.cpp)
    list(FILTER Src_SOURCES EXCLUDE REGEX ".*TaskManagerMain\\.cpp$")
    list(FILTER Src_SOURCES EXCLUDE REGEX ".*TaskManager\\.cpp$")

    if(WIN32)
        list(FILTER Src_SOURCES EXCLUDE REGEX ".*Yolov11ThreadPool\\.cpp$")
        list(FILTER Src_SOURCES EXCLUDE REGEX ".*Yolov11Engine_Fixed\\.cpp$")
    else()
        list(FILTER Src_SOURCES EXCLUDE REGEX ".*Yolov11ThreadPool_Windows\\.cpp$")
        list(FILTER Src_SOURCES EXCLUDE REGEX ".*Yolov11Engine_Fixed\\.cpp$")
    endif()

    add_executable(${PROJECT_NAME} ${Src_SOURCES})

    target_include_directories(${PROJECT_NAME} PRIVATE
        ${CMAKE_SOURCE_DIR}/src
        ${CMAKE_SOURCE_DIR}/3rdparty/cpp-httplib
        ${JSONCPP_INCLUDE_DIR}
        ${OpenCV_INCLUDE_DIRS}
    )

    if(WIN32)
        target_include_directories(${PROJECT_NAME} PRIVATE
            ${VCPKG_ROOT}/include
            ${VCPKG_ROOT}/include/onnxruntime
        )
        target_link_libraries(${PROJECT_NAME}
            ${OpenCV_LIBS}
            ${AVFORMAT_LIBRARY}
            ${AVCODEC_LIBRARY}
            ${AVUTIL_LIBRARY}
            ${SWSCALE_LIBRARY}
            CURL::libcurl
            ${JSONCPP_LINK_TARGET}
            glog::glog
            onnxruntime
            ws2_32
            bcrypt
        )
    else()
        target_include_directories(${PROJECT_NAME} PRIVATE
            /usr/include
            /usr/local/include
            /usr/local/include/onnxruntime
            /usr/local/openvino/3rdparty/jsoncpp/include
            /usr/local/openvino/3rdparty/opencv/include
        )

        target_link_libraries(${PROJECT_NAME}
            ${OpenCV_LIBS}
            avformat avcodec avutil swscale
            png z
            curl
            crypto ssl
            ${INIH_LIBRARY}
            ${PUGIXML_LIBRARY}
            ${JSONCPP_LINK_TARGET}
            ${GLOG_LIBRARY}
            onnxruntime
            pthread
        )
    endif()
endif()
