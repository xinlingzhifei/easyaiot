package com.basiclab.iot.sink.javascript;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.script.ScriptContext;
import javax.script.ScriptEngine;
import javax.script.ScriptEngineManager;
import java.util.function.Predicate;

/**
 * JavaScript 引擎工厂。
 * <p>
 * 每个产品脚本使用独立 {@link ScriptEngine}，避免多产品函数互相覆盖。
 * Java 21 默认无 Nashorn，依赖 GraalJS（见 pom）。
 * <p>
 * GraalJS 需显式打开 host access，否则 jsUtil / Java.type 不可用。
 *
 * @author reese
 * @email reese
 */
public final class JsEngine {

    private static final Logger log = LoggerFactory.getLogger(JsEngine.class);

    private static final JsUtilFunction JS_UTIL = new JsUtilFunction();

    private static final String ENGINE_IMPORT =
            "var ReadBuffer = Java.type('" + ReadBuffer.class.getName() + "');\n"
                    + "var WriteBuffer = Java.type('" + WriteBuffer.class.getName() + "');\n";

    static {
        // 降低解释器模式告警噪音（非 GraalVM JDK 时正常）
        System.setProperty("polyglot.engine.WarnInterpreterOnly", "false");
    }

    private JsEngine() {
    }

    /**
     * 创建隔离的 ScriptEngine（含 jsUtil / Graal host 权限）。
     */
    public static ScriptEngine createEngine() {
        ScriptEngineManager manager = new ScriptEngineManager();
        ScriptEngine engine = manager.getEngineByName("graal.js");
        if (engine == null) {
            engine = manager.getEngineByName("js");
        }
        if (engine == null) {
            engine = manager.getEngineByName("javascript");
        }
        if (engine == null) {
            engine = manager.getEngineByName("nashorn");
        }
        if (engine == null) {
            throw new IllegalStateException(
                    "无法找到 JavaScript 引擎。请确认 iot-sink-biz 已引入 GraalJS（js-scriptengine）依赖");
        }

        // 必须用 ScriptContext.setAttribute：GraalJS 据此打开 HostAccess.ALL
        ScriptContext ctx = engine.getContext();
        ctx.setAttribute("polyglot.js.allowHostAccess", true, ScriptContext.ENGINE_SCOPE);
        ctx.setAttribute("polyglot.js.allowHostClassLookup",
                (Predicate<String>) JsEngine::allowHostClass, ScriptContext.ENGINE_SCOPE);
        ctx.setAttribute("polyglot.js.nashorn-compat", true, ScriptContext.ENGINE_SCOPE);
        engine.put("jsUtil", JS_UTIL);

        log.debug("[createEngine][创建 JS 引擎: {}]", engine.getClass().getName());
        return engine;
    }

    public static String getJsGlobalImport() {
        return ENGINE_IMPORT;
    }

    public static String engineName() {
        try {
            return createEngine().getClass().getName();
        } catch (Exception e) {
            return "unavailable: " + e.getMessage();
        }
    }

    private static boolean allowHostClass(String className) {
        if (className == null) {
            return false;
        }
        return className.startsWith("com.basiclab.iot.sink.javascript.")
                || "java.lang.String".equals(className)
                || "java.lang.Integer".equals(className)
                || "java.lang.Long".equals(className)
                || "java.lang.Double".equals(className)
                || "java.lang.Boolean".equals(className)
                || "java.util.HashMap".equals(className)
                || "java.util.LinkedHashMap".equals(className)
                || "java.util.ArrayList".equals(className)
                || "java.nio.charset.StandardCharsets".equals(className);
    }
}
