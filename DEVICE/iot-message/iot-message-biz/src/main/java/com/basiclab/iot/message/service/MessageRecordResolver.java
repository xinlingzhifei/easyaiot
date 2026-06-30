package com.basiclab.iot.message.service;

import com.basiclab.iot.message.domain.entity.*;
import com.basiclab.iot.message.domain.enums.MessageRecordTypeEnum;
import com.basiclab.iot.message.mapper.*;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * 推送记录与模板内容合并：发送时从 ref_template_id 加载模板字段
 */
@Component
public class MessageRecordResolver {

    @Autowired
    private TMsgMailMapper tMsgMailMapper;
    @Autowired
    private TMsgSmsMapper tMsgSmsMapper;
    @Autowired
    private TMsgWxCpMapper tMsgWxCpMapper;
    @Autowired
    private TMsgHttpMapper tMsgHttpMapper;
    @Autowired
    private TMsgDingMapper tMsgDingMapper;
    @Autowired
    private TMsgFeishuMapper tMsgFeishuMapper;
    @Autowired
    private TTemplateDataMapper templateDataMapper;

    public TMsgMail resolveMail(String msgId) {
        TMsgMail record = tMsgMailMapper.selectByPrimaryKey(msgId);
        if (record == null || !isPushRecord(record.getRecordType()) || StringUtils.isBlank(record.getRefTemplateId())) {
            return record;
        }
        TMsgMail template = tMsgMailMapper.selectByPrimaryKey(record.getRefTemplateId());
        if (template == null) {
            return record;
        }
        mergeMailContent(record, template);
        return record;
    }

    public TMsgSms resolveSms(String msgId) {
        TMsgSms record = tMsgSmsMapper.selectByPrimaryKey(msgId);
        if (record == null) {
            return record;
        }
        if (isPushRecord(record.getRecordType()) && StringUtils.isNotBlank(record.getRefTemplateId())) {
            TMsgSms template = tMsgSmsMapper.selectByPrimaryKey(record.getRefTemplateId());
            if (template != null) {
                record.setTemplateId(template.getTemplateId());
                record.setContent(template.getContent());
                record.setTemplateDataList(templateDataMapper.selectByMsgTypeAndMsgId(
                        template.getMsgType(), template.getId()));
            }
        } else if (record.getTemplateDataList() == null) {
            record.setTemplateDataList(templateDataMapper.selectByMsgTypeAndMsgId(
                    record.getMsgType(), record.getId()));
        }
        return record;
    }

    public TMsgWxCp resolveWxCp(String msgId) {
        TMsgWxCp record = tMsgWxCpMapper.selectByPrimaryKey(msgId);
        if (record == null || !isPushRecord(record.getRecordType()) || StringUtils.isBlank(record.getRefTemplateId())) {
            return record;
        }
        TMsgWxCp template = tMsgWxCpMapper.selectByPrimaryKey(record.getRefTemplateId());
        if (template == null) {
            return record;
        }
        mergeWxCpContent(record, template);
        return record;
    }

    public TMsgHttp resolveHttp(String msgId) {
        TMsgHttp record = tMsgHttpMapper.selectByPrimaryKey(msgId);
        if (record == null || !isPushRecord(record.getRecordType()) || StringUtils.isBlank(record.getRefTemplateId())) {
            return record;
        }
        TMsgHttp template = tMsgHttpMapper.selectByPrimaryKey(record.getRefTemplateId());
        if (template == null) {
            return record;
        }
        record.setMethod(template.getMethod());
        record.setUrl(template.getUrl());
        record.setParams(template.getParams());
        record.setHeaders(template.getHeaders());
        record.setCookies(template.getCookies());
        record.setBody(template.getBody());
        record.setBodyType(template.getBodyType());
        return record;
    }

    public TMsgDing resolveDing(String msgId) {
        TMsgDing record = tMsgDingMapper.selectByPrimaryKey(msgId);
        if (record == null || !isPushRecord(record.getRecordType()) || StringUtils.isBlank(record.getRefTemplateId())) {
            return record;
        }
        TMsgDing template = tMsgDingMapper.selectByPrimaryKey(record.getRefTemplateId());
        if (template == null) {
            return record;
        }
        mergeDingContent(record, template);
        return record;
    }

    public TMsgFeishu resolveFeishu(String msgId) {
        TMsgFeishu record = tMsgFeishuMapper.selectByPrimaryKey(msgId);
        if (record == null || !isPushRecord(record.getRecordType()) || StringUtils.isBlank(record.getRefTemplateId())) {
            return record;
        }
        TMsgFeishu template = tMsgFeishuMapper.selectByPrimaryKey(record.getRefTemplateId());
        if (template == null) {
            return record;
        }
        mergeFeishuContent(record, template);
        return record;
    }

    private boolean isPushRecord(Integer recordType) {
        return recordType != null && recordType == MessageRecordTypeEnum.PUSH;
    }

    private void mergeMailContent(TMsgMail target, TMsgMail template) {
        target.setTitle(template.getTitle());
        target.setCc(template.getCc());
        target.setFiles(template.getFiles());
        target.setContent(template.getContent());
    }

    private void mergeWxCpContent(TMsgWxCp target, TMsgWxCp template) {
        target.setCpMsgType(template.getCpMsgType());
        target.setAgentId(template.getAgentId());
        target.setContent(template.getContent());
        target.setTitle(template.getTitle());
        target.setImgUrl(template.getImgUrl());
        target.setDescribe(template.getDescribe());
        target.setUrl(template.getUrl());
        target.setBtnTxt(template.getBtnTxt());
        target.setRadioType(template.getRadioType());
        target.setWebHook(template.getWebHook());
    }

    private void mergeDingContent(TMsgDing target, TMsgDing template) {
        target.setRadioType(template.getRadioType());
        target.setDingMsgType(template.getDingMsgType());
        target.setAgentId(template.getAgentId());
        target.setWebHook(template.getWebHook());
        target.setContent(template.getContent());
        target.setTitle(template.getTitle());
        target.setImgUrl(template.getImgUrl());
        target.setBtnTxt(template.getBtnTxt());
        target.setBtnUrl(template.getBtnUrl());
        target.setUrl(template.getUrl());
    }

    private void mergeFeishuContent(TMsgFeishu target, TMsgFeishu template) {
        target.setRadioType(template.getRadioType());
        target.setFeishuMsgType(template.getFeishuMsgType());
        target.setWebHook(template.getWebHook());
        target.setContent(template.getContent());
        target.setTitle(template.getTitle());
        target.setImgUrl(template.getImgUrl());
        target.setBtnTxt(template.getBtnTxt());
        target.setBtnUrl(template.getBtnUrl());
        target.setUrl(template.getUrl());
    }
}
