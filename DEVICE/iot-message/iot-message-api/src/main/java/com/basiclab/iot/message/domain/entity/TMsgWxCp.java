package com.basiclab.iot.message.domain.entity;

import lombok.Data;

import java.io.Serializable;
import java.util.Date;

@Data
public class TMsgWxCp implements Serializable {
    private String id;

    private Integer msgType;

    private String msgName;

    private String cpMsgType;

    private String agentId;

    private String content;

    private String title;

    private String imgUrl;

    private String describe;

    private String url;

    private String btnTxt;

    private Date createTime;

    private Date modifiedTime;

    private String previewUser;

    private String userGroupId;

    private String userGroupName;

    /** 通知方式：工作通知方式 / 群机器人消息 */
    private String radioType;

    /** 企业微信群机器人 Webhook 地址 */
    private String webHook;

    /** 0=模板 1=推送 */
    private Integer recordType;

    /** 推送记录关联的消息模板ID */
    private String refTemplateId;

    /** 关联模板名称（查询展示用） */
    private String templateName;

    private static final long serialVersionUID = 1L;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public Integer getMsgType() {
        return msgType;
    }

    public void setMsgType(Integer msgType) {
        this.msgType = msgType;
    }

    public String getMsgName() {
        return msgName;
    }

    public void setMsgName(String msgName) {
        this.msgName = msgName == null ? null : msgName.trim();
    }

    public String getCpMsgType() {
        return cpMsgType;
    }

    public void setCpMsgType(String cpMsgType) {
        this.cpMsgType = cpMsgType == null ? null : cpMsgType.trim();
    }

    public String getAgentId() {
        return agentId;
    }

    public void setAgentId(String agentId) {
        this.agentId = agentId == null ? null : agentId.trim();
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content == null ? null : content.trim();
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title == null ? null : title.trim();
    }

    public String getImgUrl() {
        return imgUrl;
    }

    public void setImgUrl(String imgUrl) {
        this.imgUrl = imgUrl == null ? null : imgUrl.trim();
    }

    public String getDescribe() {
        return describe;
    }

    public void setDescribe(String describe) {
        this.describe = describe == null ? null : describe.trim();
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url == null ? null : url.trim();
    }

    public String getBtnTxt() {
        return btnTxt;
    }

    public void setBtnTxt(String btnTxt) {
        this.btnTxt = btnTxt == null ? null : btnTxt.trim();
    }

    public String getPreviewUser() {
        return previewUser;
    }

    public void setPreviewUser(String previewUser) {
        this.previewUser = previewUser == null ? null : previewUser.trim();
    }
}