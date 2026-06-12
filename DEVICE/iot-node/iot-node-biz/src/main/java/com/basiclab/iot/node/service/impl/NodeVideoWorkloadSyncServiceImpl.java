package com.basiclab.iot.node.service.impl;

import com.basiclab.iot.node.dal.dataobject.ComputeNodeDO;
import com.basiclab.iot.node.dal.dataobject.NodeSshCredentialDO;
import com.basiclab.iot.node.dal.pgsql.NodeSshCredentialMapper;
import com.basiclab.iot.node.enums.WorkloadBundleTypeEnum;
import com.basiclab.iot.node.service.NodeVideoWorkloadSyncService;
import com.basiclab.iot.node.util.CredentialEncryptUtil;
import com.basiclab.iot.node.util.SshSessionHelper;
import com.basiclab.iot.node.util.WorkloadBundleDeployUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;
import java.io.File;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

import static com.basiclab.iot.common.exception.util.ServiceExceptionUtil.exception;
import static com.basiclab.iot.node.enums.ErrorCodeConstants.SSH_CREDENTIAL_NOT_EXISTS;
import static com.basiclab.iot.node.enums.ErrorCodeConstants.VIDEO_SOURCE_NOT_FOUND;

/**
 * 远程工作负载部署前，经 SSH 将控制面 VIDEO 代码同步到计算节点。
 */
@Slf4j
@Service
public class NodeVideoWorkloadSyncServiceImpl implements NodeVideoWorkloadSyncService {

    @Resource
    private NodeSshCredentialMapper nodeSshCredentialMapper;

    @Value("${easyaiot.video.source-path:}")
    private String videoSourcePath;

    @Value("${easyaiot.video.remote-root:" + WorkloadBundleDeployUtil.REMOTE_VIDEO_ROOT + "}")
    private String videoRemoteRoot;

    @Value("${easyaiot.video.auto-sync-before-deploy:true}")
    private boolean autoSyncBeforeDeploy;

    @Override
    public void syncBeforeDeploy(ComputeNodeDO node, String workloadType) {
        if (!autoSyncBeforeDeploy || !WorkloadBundleDeployUtil.requiresVideoSync(workloadType)) {
            return;
        }
        List<String> relativePaths = resolveSyncPaths(workloadType);
        if (relativePaths.isEmpty()) {
            return;
        }

        String sourceRoot = resolveVideoSourceRoot();
        NodeSshCredential sshCredential = loadSshCredential(node.getId());
        int sshPort = ComputeNodeServiceImpl.resolveSshPort(node);

        int uploaded = 0;
        try (SshSessionHelper ssh = openSshSession(node, sshCredential, sshPort)) {
            ssh.ensureRemoteDir(videoRemoteRoot);
            for (String relative : relativePaths) {
                File local = new File(sourceRoot, relative);
                String remote = videoRemoteRoot + "/" + relative;
                if (local.isFile()) {
                    ssh.uploadFile(local.getAbsolutePath(), remote);
                    uploaded++;
                } else if (local.isDirectory()) {
                    uploaded += ssh.uploadDirectoryRecursive(
                            local,
                            remote,
                            WorkloadBundleDeployUtil::shouldSkipDirectory,
                            WorkloadBundleDeployUtil::shouldSkipFile);
                } else {
                    throw exception(VIDEO_SOURCE_NOT_FOUND);
                }
            }
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            log.error("VIDEO 代码 SSH 同步失败 nodeId={} host={} type={}: {}",
                    node.getId(), node.getHost(), workloadType, e.getMessage(), e);
            throw new IllegalStateException(
                    "VIDEO 代码同步失败: " + node.getHost() + " — " + e.getMessage(), e);
        }

        log.info(
                "VIDEO 工作负载代码已同步 nodeId={} host={} type={} files={} remote={}",
                node.getId(), node.getHost(), workloadType, uploaded, videoRemoteRoot);
    }

    private List<String> resolveSyncPaths(String workloadType) {
        Set<String> paths = new LinkedHashSet<>();
        String t = workloadType == null ? "" : workloadType.trim().toLowerCase(Locale.ROOT);
        if ("stream_forward".equals(t)) {
            paths.addAll(WorkloadBundleDeployUtil.syncScriptRelativePaths(WorkloadBundleTypeEnum.STREAM_FORWARD));
        } else if ("algorithm_task".equals(t)) {
            paths.addAll(WorkloadBundleDeployUtil.syncScriptRelativePaths(WorkloadBundleTypeEnum.ALGORITHM_REALTIME));
            paths.addAll(WorkloadBundleDeployUtil.syncScriptRelativePaths(WorkloadBundleTypeEnum.ALGORITHM_SNAP));
        } else {
            WorkloadBundleTypeEnum bundle = WorkloadBundleTypeEnum.of(t);
            if (bundle != null && "VIDEO".equals(bundle.getModule())) {
                paths.addAll(WorkloadBundleDeployUtil.syncScriptRelativePaths(bundle));
            }
        }
        return new ArrayList<>(paths);
    }

    private String resolveVideoSourceRoot() {
        if (videoSourcePath != null && !videoSourcePath.isBlank()) {
            File dir = new File(videoSourcePath.trim());
            if (dir.isDirectory()) {
                return dir.getAbsolutePath();
            }
        }
        String userDir = System.getProperty("user.dir");
        String[] candidates = {
                "/opt/easyaiot/VIDEO",
                userDir + "/VIDEO",
                userDir + "/../VIDEO",
                userDir + "/../../VIDEO",
        };
        for (String path : candidates) {
            File models = new File(path, "models.py");
            File runDeploy = new File(path, "services/stream_forward_service/run_deploy.py");
            if (models.isFile() && runDeploy.isFile()) {
                return new File(path).getAbsolutePath();
            }
        }
        throw exception(VIDEO_SOURCE_NOT_FOUND);
    }

    private NodeSshCredential loadSshCredential(Long nodeId) {
        NodeSshCredentialDO credential = nodeSshCredentialMapper.selectByNodeId(nodeId);
        if (credential == null) {
            throw exception(SSH_CREDENTIAL_NOT_EXISTS);
        }
        String password = null;
        String privateKey = null;
        if ("password".equals(credential.getAuthType())) {
            password = CredentialEncryptUtil.decrypt(credential.getCredentialEnc());
        } else {
            privateKey = CredentialEncryptUtil.decrypt(credential.getCredentialEnc());
        }
        return new NodeSshCredential(credential, password, privateKey);
    }

    private SshSessionHelper openSshSession(ComputeNodeDO node, NodeSshCredential credential, int sshPort)
            throws Exception {
        return SshSessionHelper.connect(
                node.getHost(),
                sshPort,
                credential.credential.getUsername(),
                credential.credential.getAuthType(),
                credential.password,
                credential.privateKey);
    }

    private static final class NodeSshCredential {
        private final NodeSshCredentialDO credential;
        private final String password;
        private final String privateKey;

        private NodeSshCredential(NodeSshCredentialDO credential, String password, String privateKey) {
            this.credential = credential;
            this.password = password;
            this.privateKey = privateKey;
        }
    }
}
