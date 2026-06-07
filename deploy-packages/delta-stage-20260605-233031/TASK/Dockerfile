FROM ubuntu:22.04 AS build

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        cmake \
        g++ \
        make \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /src
COPY . .

RUN cmake -S . -B build \
        -DBUILD_TASK_RUNTIME=OFF \
        -DBUILD_TASK_MANAGER=ON \
        -DCMAKE_BUILD_TYPE=Release \
    && cmake --build build --target TaskManager -- -j2

FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /app/config/generated /app/bin

COPY --from=build /src/build/TaskManager /usr/local/bin/TaskManager

WORKDIR /app
EXPOSE 7000

CMD ["TaskManager", "--host", "0.0.0.0", "--port", "7000", "--task-bin", "/app/bin/TASK", "--config-dir", "/app/config/generated"]
