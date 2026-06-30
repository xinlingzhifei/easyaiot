package com.basiclab.iot.message.service.impl;

import com.basiclab.iot.message.domain.entity.*;
import com.basiclab.iot.message.domain.enums.MessageRecordTypeEnum;
import com.basiclab.iot.message.domain.model.vo.MessagePrepareVO;
import com.basiclab.iot.message.mapper.*;
import com.basiclab.iot.message.service.MessageTemplateService;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.collections4.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

/**
 * 消息模板服务实现（record_type=0，与推送分离）
 */
@Slf4j
@Component
public class MessageTemplateServiceImpl implements MessageTemplateService {

    @Autowired
    private TMsgMailMapper tMsgMailMapper;
    @Autowired
    private TMsgDingMapper tMsgDingMapper;
    @Autowired
    private TMsgHttpMapper tMsgHttpMapper;
    @Autowired
    private TMsgSmsMapper tMsgSmsMapper;
    @Autowired
    private TMsgWxCpMapper tMsgWxCpMapper;
    @Autowired
    private TMsgFeishuMapper tMsgFeishuMapper;
    @Autowired
    private TTemplateDataMapper templateDataMapper;
    @Autowired
    private TPreviewUserGroupMapper tPreviewUserGroupMapper;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public MessagePrepareVO add(MessagePrepareVO vo) {
        int msgType = vo.getMsgType();
        validateBeforeSave(msgType, vo, null);
        switch (msgType) {
            case 1:
            case 2:
                return addSms(vo, msgType);
            case 3:
                TMsgMail mail = vo.getT_Msg_Mail();
                initTemplateEntity(mail);
                mail.setMsgType(msgType);
                mail.setRecordType(MessageRecordTypeEnum.TEMPLATE);
                tMsgMailMapper.insert(mail);
                vo.setT_Msg_Mail(mail);
                return vo;
            case 4:
                TMsgWxCp wxCp = vo.getT_Msg_Wx_Cp();
                initTemplateEntity(wxCp);
                wxCp.setMsgType(msgType);
                wxCp.setRecordType(MessageRecordTypeEnum.TEMPLATE);
                tMsgWxCpMapper.insert(wxCp);
                vo.setT_Msg_Wx_Cp(wxCp);
                return vo;
            case 5:
                TMsgHttp http = vo.getT_Msg_Http();
                initTemplateEntity(http);
                http.setMsgType(msgType);
                http.setRecordType(MessageRecordTypeEnum.TEMPLATE);
                tMsgHttpMapper.insert(http);
                vo.setT_Msg_Http(http);
                return vo;
            case 6:
                TMsgDing ding = vo.getT_Msg_Ding();
                initTemplateEntity(ding);
                ding.setMsgType(msgType);
                ding.setRecordType(MessageRecordTypeEnum.TEMPLATE);
                tMsgDingMapper.insert(ding);
                vo.setT_Msg_Ding(ding);
                return vo;
            case 7:
                TMsgFeishu feishu = vo.getT_Msg_Feishu();
                initTemplateEntity(feishu);
                feishu.setMsgType(msgType);
                feishu.setRecordType(MessageRecordTypeEnum.TEMPLATE);
                tMsgFeishuMapper.insert(feishu);
                vo.setT_Msg_Feishu(feishu);
                return vo;
            default:
                throw new IllegalArgumentException("不支持的消息类型: " + msgType);
        }
    }

    private MessagePrepareVO addSms(MessagePrepareVO vo, int msgType) {
        TMsgSms sms = vo.getT_Msg_Sms();
        initTemplateEntity(sms);
        sms.setMsgType(msgType);
        sms.setRecordType(MessageRecordTypeEnum.TEMPLATE);
        tMsgSmsMapper.insert(sms);
        vo.setT_Msg_Sms(sms);
        for (TTemplateData data : CollectionUtils.emptyIfNull(vo.getTemplateDataList())) {
            data.setId(UUID.randomUUID().toString());
            data.setCreateTime(new Date());
            data.setMsgId(sms.getId());
            data.setMsgType(msgType);
            templateDataMapper.insert(data);
        }
        return vo;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public MessagePrepareVO update(MessagePrepareVO vo) {
        int msgType = vo.getMsgType();
        String excludeId = extractId(vo, msgType);
        validateBeforeSave(msgType, vo, excludeId);
        switch (msgType) {
            case 1:
            case 2:
                return updateSms(vo, msgType);
            case 3:
                TMsgMail mail = vo.getT_Msg_Mail();
                mail.setModifiedTime(new Date());
                mail.setRecordType(MessageRecordTypeEnum.TEMPLATE);
                tMsgMailMapper.updateByPrimaryKeySelective(mail);
                vo.setT_Msg_Mail(mail);
                return vo;
            case 4:
                TMsgWxCp wxCp = vo.getT_Msg_Wx_Cp();
                wxCp.setModifiedTime(new Date());
                wxCp.setRecordType(MessageRecordTypeEnum.TEMPLATE);
                tMsgWxCpMapper.updateByPrimaryKeySelective(wxCp);
                vo.setT_Msg_Wx_Cp(wxCp);
                return vo;
            case 5:
                TMsgHttp http = vo.getT_Msg_Http();
                http.setModifiedTime(new Date());
                http.setRecordType(MessageRecordTypeEnum.TEMPLATE);
                tMsgHttpMapper.updateByPrimaryKeySelective(http);
                vo.setT_Msg_Http(http);
                return vo;
            case 6:
                TMsgDing ding = vo.getT_Msg_Ding();
                ding.setModifiedTime(new Date());
                ding.setRecordType(MessageRecordTypeEnum.TEMPLATE);
                tMsgDingMapper.updateByPrimaryKeySelective(ding);
                vo.setT_Msg_Ding(ding);
                return vo;
            case 7:
                TMsgFeishu feishu = vo.getT_Msg_Feishu();
                feishu.setModifiedTime(new Date());
                feishu.setRecordType(MessageRecordTypeEnum.TEMPLATE);
                tMsgFeishuMapper.updateByPrimaryKeySelective(feishu);
                vo.setT_Msg_Feishu(feishu);
                return vo;
            default:
                throw new IllegalArgumentException("不支持的消息类型: " + msgType);
        }
    }

    private MessagePrepareVO updateSms(MessagePrepareVO vo, int msgType) {
        TMsgSms sms = vo.getT_Msg_Sms();
        sms.setModifiedTime(new Date());
        sms.setRecordType(MessageRecordTypeEnum.TEMPLATE);
        tMsgSmsMapper.updateByPrimaryKeySelective(sms);
        templateDataMapper.deleteByMsgTypeAndMsgId(msgType, sms.getId());
        for (TTemplateData data : CollectionUtils.emptyIfNull(vo.getTemplateDataList())) {
            data.setId(UUID.randomUUID().toString());
            data.setCreateTime(new Date());
            data.setMsgId(sms.getId());
            data.setMsgType(msgType);
            templateDataMapper.insert(data);
        }
        vo.setT_Msg_Sms(sms);
        return vo;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public String delete(int msgType, String id) {
        if (StringUtils.isBlank(id)) {
            return id;
        }
        switch (msgType) {
            case 1:
            case 2:
                templateDataMapper.deleteByMsgTypeAndMsgId(msgType, id);
                tMsgSmsMapper.deleteByPrimaryKey(id);
                break;
            case 3:
                tMsgMailMapper.deleteByPrimaryKey(id);
                break;
            case 4:
                tMsgWxCpMapper.deleteByPrimaryKey(id);
                break;
            case 5:
                tMsgHttpMapper.deleteByPrimaryKey(id);
                break;
            case 6:
                tMsgDingMapper.deleteByPrimaryKey(id);
                break;
            case 7:
                tMsgFeishuMapper.deleteByPrimaryKey(id);
                break;
            default:
                break;
        }
        return id;
    }

    @Override
    public List<?> query(MessagePrepareVO vo) {
        int msgType = vo.getMsgType();
        String msgName = vo.getMsgName();
        List<?> list;
        switch (msgType) {
            case 1:
            case 2:
                list = filterTemplates(tMsgSmsMapper.selectByMsgTypeAndMsgName(msgType, msgName));
                for (TMsgSms sms : (List<TMsgSms>) list) {
                    sms.setTemplateDataList(templateDataMapper.selectByMsgTypeAndMsgId(msgType, sms.getId()));
                    enrichUserGroupName(sms);
                }
                return list;
            case 3:
                list = filterTemplates(tMsgMailMapper.selectByMsgTypeAndMsgName(msgType, msgName));
                for (TMsgMail mail : (List<TMsgMail>) list) {
                    enrichUserGroupName(mail);
                }
                return list;
            case 4:
                list = filterTemplates(tMsgWxCpMapper.selectByMsgTypeAndMsgName(msgType, msgName));
                for (TMsgWxCp wxCp : (List<TMsgWxCp>) list) {
                    enrichUserGroupName(wxCp);
                }
                return list;
            case 5:
                return filterTemplates(tMsgHttpMapper.selectByMsgTypeAndMsgName(msgType, msgName));
            case 6:
                list = filterTemplates(tMsgDingMapper.selectByMsgTypeAndMsgName(msgType, msgName));
                for (TMsgDing ding : (List<TMsgDing>) list) {
                    enrichUserGroupName(ding);
                }
                return list;
            case 7:
                list = filterTemplates(tMsgFeishuMapper.selectByMsgTypeAndMsgName(msgType, msgName));
                for (TMsgFeishu feishu : (List<TMsgFeishu>) list) {
                    enrichUserGroupName(feishu);
                }
                return list;
            default:
                return Collections.emptyList();
        }
    }

    @Override
    public Map<String, Object> getById(String id, int msgType) {
        return buildTemplateMap(id, msgType);
    }

    @Override
    public List<Map<String, Object>> queryByType(int msgType) {
        List<Map<String, Object>> templates = new ArrayList<>();
        switch (msgType) {
            case 1:
            case 2:
                for (TMsgSms sms : filterTemplates(tMsgSmsMapper.selectByMsgType(msgType))) {
                    templates.add(toListItem(sms.getId(), sms.getMsgName(), null, sms.getMsgName()));
                }
                break;
            case 3:
                for (TMsgMail mail : filterTemplates(tMsgMailMapper.selectByMsgType(msgType))) {
                    templates.add(toListItem(mail.getId(), displayName(mail.getTitle(), mail.getMsgName()), mail.getTitle(), mail.getMsgName()));
                }
                break;
            case 4:
                for (TMsgWxCp wxCp : filterTemplates(tMsgWxCpMapper.selectByMsgType(msgType))) {
                    templates.add(toListItem(wxCp.getId(), displayName(wxCp.getTitle(), wxCp.getMsgName()), wxCp.getTitle(), wxCp.getMsgName()));
                }
                break;
            case 5:
                for (TMsgHttp http : filterTemplates(tMsgHttpMapper.selectByMsgType(msgType))) {
                    templates.add(toListItem(http.getId(), http.getMsgName(), null, http.getMsgName()));
                }
                break;
            case 6:
                for (TMsgDing ding : filterTemplates(tMsgDingMapper.selectByMsgType(msgType))) {
                    templates.add(toListItem(ding.getId(), displayName(ding.getTitle(), ding.getMsgName()), ding.getTitle(), ding.getMsgName()));
                }
                break;
            case 7:
                for (TMsgFeishu feishu : filterTemplates(tMsgFeishuMapper.selectByMsgType(msgType))) {
                    templates.add(toListItem(feishu.getId(), displayName(feishu.getTitle(), feishu.getMsgName()), feishu.getTitle(), feishu.getMsgName()));
                }
                break;
            default:
                break;
        }
        return templates;
    }

    @Override
    public void validateTemplateUnique(int msgType, String title, String msgName, String excludeId) {
        if (usesTitleUnique(msgType)) {
            if (StringUtils.isBlank(title)) {
                throw new IllegalArgumentException("模板标题不能为空");
            }
            if (msgType == 3 && tMsgMailMapper.countByTitleAndMsgType(msgType, title, excludeId) > 0) {
                throw new IllegalArgumentException("该渠道下已存在相同标题的模板: " + title);
            }
            validateTitleUniqueInList(msgType, title, excludeId);
        } else {
            if (StringUtils.isBlank(msgName)) {
                throw new IllegalArgumentException("模板名称不能为空");
            }
            validateNameUniqueInList(msgType, msgName, excludeId);
        }
    }

    private void validateTitleUniqueInList(int msgType, String title, String excludeId) {
        List<?> all = queryByType(msgType);
        for (Object item : all) {
            if (!(item instanceof Map)) {
                continue;
            }
            Map<?, ?> map = (Map<?, ?>) item;
            String id = String.valueOf(map.get("id"));
            String existingTitle = map.get("title") != null ? String.valueOf(map.get("title")) : null;
            if (!id.equals(excludeId) && title.equals(existingTitle)) {
                throw new IllegalArgumentException("该渠道下已存在相同标题的模板: " + title);
            }
        }
    }

    private void validateNameUniqueInList(int msgType, String msgName, String excludeId) {
        List<?> list;
        switch (msgType) {
            case 1:
            case 2:
                list = filterTemplates(tMsgSmsMapper.selectByMsgType(msgType));
                for (TMsgSms sms : (List<TMsgSms>) list) {
                    if (!sms.getId().equals(excludeId) && msgName.equals(sms.getMsgName())) {
                        throw new IllegalArgumentException("该渠道下已存在相同名称的模板: " + msgName);
                    }
                }
                break;
            case 5:
                list = filterTemplates(tMsgHttpMapper.selectByMsgType(msgType));
                for (TMsgHttp http : (List<TMsgHttp>) list) {
                    if (!http.getId().equals(excludeId) && msgName.equals(http.getMsgName())) {
                        throw new IllegalArgumentException("该渠道下已存在相同名称的模板: " + msgName);
                    }
                }
                break;
            default:
                break;
        }
    }

    private void validateBeforeSave(int msgType, MessagePrepareVO vo, String excludeId) {
        String title = null;
        String msgName = null;
        switch (msgType) {
            case 3:
                title = vo.getT_Msg_Mail().getTitle();
                msgName = vo.getT_Msg_Mail().getMsgName();
                break;
            case 4:
                title = vo.getT_Msg_Wx_Cp().getTitle();
                msgName = vo.getT_Msg_Wx_Cp().getMsgName();
                break;
            case 5:
                msgName = vo.getT_Msg_Http().getMsgName();
                break;
            case 6:
                title = vo.getT_Msg_Ding().getTitle();
                msgName = vo.getT_Msg_Ding().getMsgName();
                break;
            case 7:
                title = vo.getT_Msg_Feishu().getTitle();
                msgName = vo.getT_Msg_Feishu().getMsgName();
                break;
            case 1:
            case 2:
                msgName = vo.getT_Msg_Sms().getMsgName();
                break;
            default:
                break;
        }
        validateTemplateUnique(msgType, title, msgName, excludeId);
    }

    private String extractId(MessagePrepareVO vo, int msgType) {
        switch (msgType) {
            case 3: return vo.getT_Msg_Mail().getId();
            case 4: return vo.getT_Msg_Wx_Cp().getId();
            case 5: return vo.getT_Msg_Http().getId();
            case 6: return vo.getT_Msg_Ding().getId();
            case 7: return vo.getT_Msg_Feishu().getId();
            case 1:
            case 2: return vo.getT_Msg_Sms().getId();
            default: return null;
        }
    }

    private boolean usesTitleUnique(int msgType) {
        return msgType == 3 || msgType == 4 || msgType == 6 || msgType == 7;
    }

    private <T> List<T> filterTemplates(List<T> list) {
        if (list == null) {
            return Collections.emptyList();
        }
        return list.stream()
                .filter(item -> isTemplateRecord(item))
                .collect(Collectors.toList());
    }

    private boolean isTemplateRecord(Object entity) {
        Integer recordType = null;
        if (entity instanceof TMsgMail) {
            recordType = ((TMsgMail) entity).getRecordType();
        } else if (entity instanceof TMsgSms) {
            recordType = ((TMsgSms) entity).getRecordType();
        } else if (entity instanceof TMsgWxCp) {
            recordType = ((TMsgWxCp) entity).getRecordType();
        } else if (entity instanceof TMsgHttp) {
            recordType = ((TMsgHttp) entity).getRecordType();
        } else if (entity instanceof TMsgDing) {
            recordType = ((TMsgDing) entity).getRecordType();
        } else if (entity instanceof TMsgFeishu) {
            recordType = ((TMsgFeishu) entity).getRecordType();
        }
        return recordType == null || recordType == MessageRecordTypeEnum.TEMPLATE;
    }

    private boolean isPushRecord(Object entity) {
        Integer recordType = null;
        if (entity instanceof TMsgMail) {
            recordType = ((TMsgMail) entity).getRecordType();
        } else if (entity instanceof TMsgSms) {
            recordType = ((TMsgSms) entity).getRecordType();
        } else if (entity instanceof TMsgWxCp) {
            recordType = ((TMsgWxCp) entity).getRecordType();
        } else if (entity instanceof TMsgHttp) {
            recordType = ((TMsgHttp) entity).getRecordType();
        } else if (entity instanceof TMsgDing) {
            recordType = ((TMsgDing) entity).getRecordType();
        } else if (entity instanceof TMsgFeishu) {
            recordType = ((TMsgFeishu) entity).getRecordType();
        }
        return recordType != null && recordType == MessageRecordTypeEnum.PUSH;
    }

    private void initTemplateEntity(Object entity) {
        if (entity instanceof TMsgMail) {
            TMsgMail e = (TMsgMail) entity;
            if (StringUtils.isBlank(e.getId())) {
                e.setId(UUID.randomUUID().toString());
            }
            e.setCreateTime(new Date());
        } else if (entity instanceof TMsgSms) {
            TMsgSms e = (TMsgSms) entity;
            if (StringUtils.isBlank(e.getId())) {
                e.setId(UUID.randomUUID().toString());
            }
            e.setCreateTime(new Date());
        } else if (entity instanceof TMsgWxCp) {
            TMsgWxCp e = (TMsgWxCp) entity;
            if (StringUtils.isBlank(e.getId())) {
                e.setId(UUID.randomUUID().toString());
            }
            e.setCreateTime(new Date());
        } else if (entity instanceof TMsgHttp) {
            TMsgHttp e = (TMsgHttp) entity;
            if (StringUtils.isBlank(e.getId())) {
                e.setId(UUID.randomUUID().toString());
            }
            e.setCreateTime(new Date());
        } else if (entity instanceof TMsgDing) {
            TMsgDing e = (TMsgDing) entity;
            if (StringUtils.isBlank(e.getId())) {
                e.setId(UUID.randomUUID().toString());
            }
            e.setCreateTime(new Date());
        } else if (entity instanceof TMsgFeishu) {
            TMsgFeishu e = (TMsgFeishu) entity;
            if (StringUtils.isBlank(e.getId())) {
                e.setId(UUID.randomUUID().toString());
            }
            e.setCreateTime(new Date());
        }
    }

    private void enrichUserGroupName(TMsgMail mail) {
        mail.setUserGroupName(tPreviewUserGroupMapper.getGroupNameById(mail.getUserGroupId()));
    }

    private void enrichUserGroupName(TMsgSms sms) {
        sms.setUserGroupName(tPreviewUserGroupMapper.getGroupNameById(sms.getUserGroupId()));
    }

    private void enrichUserGroupName(TMsgWxCp wxCp) {
        wxCp.setUserGroupName(tPreviewUserGroupMapper.getGroupNameById(wxCp.getUserGroupId()));
    }

    private void enrichUserGroupName(TMsgDing ding) {
        ding.setUserGroupName(tPreviewUserGroupMapper.getGroupNameById(ding.getUserGroupId()));
    }

    private void enrichUserGroupName(TMsgFeishu feishu) {
        feishu.setUserGroupName(tPreviewUserGroupMapper.getGroupNameById(feishu.getUserGroupId()));
    }

    private Map<String, Object> toListItem(String id, String name, String title, String msgName) {
        Map<String, Object> item = new HashMap<>();
        item.put("id", id);
        item.put("name", name);
        item.put("title", title);
        item.put("msgName", msgName);
        return item;
    }

    private String displayName(String title, String msgName) {
        return StringUtils.isNotBlank(title) ? title : msgName;
    }

    private Map<String, Object> buildTemplateMap(String id, int msgType) {
        Map<String, Object> template = new HashMap<>();
        switch (msgType) {
            case 1:
            case 2:
                TMsgSms sms = tMsgSmsMapper.selectByPrimaryKey(id);
                if (sms == null || isPushRecord(sms)) {
                    return null;
                }
                template.put("id", sms.getId());
                template.put("msgType", sms.getMsgType());
                template.put("msgName", sms.getMsgName());
                template.put("templateId", sms.getTemplateId());
                template.put("content", sms.getContent());
                template.put("userGroupId", sms.getUserGroupId());
                break;
            case 3:
                TMsgMail mail = tMsgMailMapper.selectByPrimaryKey(id);
                if (mail == null || isPushRecord(mail)) {
                    return null;
                }
                template.put("id", mail.getId());
                template.put("msgType", mail.getMsgType());
                template.put("msgName", mail.getMsgName());
                template.put("title", mail.getTitle());
                template.put("cc", mail.getCc());
                template.put("files", mail.getFiles());
                template.put("content", mail.getContent());
                template.put("userGroupId", mail.getUserGroupId());
                break;
            case 4:
                TMsgWxCp wxCp = tMsgWxCpMapper.selectByPrimaryKey(id);
                if (wxCp == null || isPushRecord(wxCp)) {
                    return null;
                }
                template.put("id", wxCp.getId());
                template.put("msgType", wxCp.getMsgType());
                template.put("msgName", wxCp.getMsgName());
                template.put("title", wxCp.getTitle());
                template.put("content", wxCp.getContent());
                template.put("url", wxCp.getUrl());
                template.put("btnTxt", wxCp.getBtnTxt());
                template.put("userGroupId", wxCp.getUserGroupId());
                template.put("radioType", wxCp.getRadioType());
                template.put("webHook", wxCp.getWebHook());
                template.put("cpMsgType", wxCp.getCpMsgType());
                template.put("agentId", wxCp.getAgentId());
                break;
            case 5:
                TMsgHttp http = tMsgHttpMapper.selectByPrimaryKey(id);
                if (http == null || isPushRecord(http)) {
                    return null;
                }
                template.put("id", http.getId());
                template.put("msgType", http.getMsgType());
                template.put("msgName", http.getMsgName());
                template.put("url", http.getUrl());
                template.put("method", http.getMethod());
                template.put("headers", http.getHeaders());
                template.put("body", http.getBody());
                template.put("userGroupId", http.getUserGroupId());
                break;
            case 6:
                TMsgDing ding = tMsgDingMapper.selectByPrimaryKey(id);
                if (ding == null || isPushRecord(ding)) {
                    return null;
                }
                template.put("id", ding.getId());
                template.put("msgType", ding.getMsgType());
                template.put("msgName", ding.getMsgName());
                template.put("title", ding.getTitle());
                template.put("content", ding.getContent());
                template.put("imgUrl", ding.getImgUrl());
                template.put("btnTxt", ding.getBtnTxt());
                template.put("btnUrl", ding.getBtnUrl());
                template.put("url", ding.getUrl());
                template.put("userGroupId", ding.getUserGroupId());
                template.put("radioType", ding.getRadioType());
                template.put("webHook", ding.getWebHook());
                template.put("dingMsgType", ding.getDingMsgType());
                template.put("agentId", ding.getAgentId());
                break;
            case 7:
                TMsgFeishu feishu = tMsgFeishuMapper.selectByPrimaryKey(id);
                if (feishu == null || isPushRecord(feishu)) {
                    return null;
                }
                template.put("id", feishu.getId());
                template.put("msgType", feishu.getMsgType());
                template.put("msgName", feishu.getMsgName());
                template.put("title", feishu.getTitle());
                template.put("content", feishu.getContent());
                template.put("imgUrl", feishu.getImgUrl());
                template.put("btnTxt", feishu.getBtnTxt());
                template.put("btnUrl", feishu.getBtnUrl());
                template.put("url", feishu.getUrl());
                template.put("userGroupId", feishu.getUserGroupId());
                template.put("radioType", feishu.getRadioType());
                template.put("webHook", feishu.getWebHook());
                template.put("feishuMsgType", feishu.getFeishuMsgType());
                break;
            default:
                return null;
        }
        return template;
    }
}
