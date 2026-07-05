package com.basiclab.iot.system.service.supervision;

import com.basiclab.iot.common.core.context.TenantContextHolder;
import com.basiclab.iot.system.dal.dataobject.supervision.SupervisionAlertReviewEvidenceDO;
import com.basiclab.iot.system.dal.dataobject.supervision.SupervisionAlertReviewCaseAuditDO;
import com.basiclab.iot.system.dal.dataobject.supervision.SupervisionAlertReviewCaseDO;
import com.basiclab.iot.system.dal.dataobject.supervision.SupervisionAlertReviewCaseItemDO;
import com.basiclab.iot.system.dal.dataobject.supervision.SupervisionAlertReviewExportJobDO;
import com.basiclab.iot.system.dal.dataobject.supervision.SupervisionAlertReviewIngestIdentityDO;
import com.basiclab.iot.system.dal.dataobject.supervision.SupervisionAlertReviewItemDO;
import com.basiclab.iot.system.dal.dataobject.supervision.SupervisionAlertReviewRuleDO;
import com.basiclab.iot.system.dal.dataobject.supervision.SupervisionAlertReviewRuntimeLockDO;
import com.basiclab.iot.system.dal.dataobject.supervision.SupervisionAlertReviewRuntimeOutboxDO;
import com.basiclab.iot.system.dal.dataobject.supervision.SupervisionAlertReviewRuntimeRunDO;
import com.basiclab.iot.system.dal.dataobject.supervision.SupervisionAlertReviewSegmentDO;
import com.basiclab.iot.system.dal.dataobject.supervision.SupervisionAlertReviewSemanticIndexDO;
import com.basiclab.iot.system.dal.dataobject.supervision.SupervisionAlertReviewUserStatusDO;
import com.basiclab.iot.system.dal.dataobject.supervision.SupervisionEventDO;
import com.basiclab.iot.system.dal.pgsql.supervision.SupervisionAlertReviewCaseItemMapper;
import com.basiclab.iot.system.dal.pgsql.supervision.SupervisionAlertReviewCaseAuditMapper;
import com.basiclab.iot.system.dal.pgsql.supervision.SupervisionAlertReviewCaseMapper;
import com.basiclab.iot.system.dal.pgsql.supervision.SupervisionAlertReviewEvidenceMapper;
import com.basiclab.iot.system.dal.pgsql.supervision.SupervisionAlertReviewExportJobMapper;
import com.basiclab.iot.system.dal.pgsql.supervision.SupervisionAlertReviewIngestIdentityMapper;
import com.basiclab.iot.system.dal.pgsql.supervision.SupervisionAlertReviewItemMapper;
import com.basiclab.iot.system.dal.pgsql.supervision.SupervisionAlertReviewRuleMapper;
import com.basiclab.iot.system.dal.pgsql.supervision.SupervisionAlertReviewRuntimeLockMapper;
import com.basiclab.iot.system.dal.pgsql.supervision.SupervisionAlertReviewRuntimeOutboxMapper;
import com.basiclab.iot.system.dal.pgsql.supervision.SupervisionAlertReviewRuntimeRunMapper;
import com.basiclab.iot.system.dal.pgsql.supervision.SupervisionAlertReviewSegmentMapper;
import com.basiclab.iot.system.dal.pgsql.supervision.SupervisionAlertReviewSemanticIndexMapper;
import com.basiclab.iot.system.dal.pgsql.supervision.SupervisionAlertReviewUserStatusMapper;
import com.basiclab.iot.system.dal.pgsql.supervision.SupervisionEventMapper;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.EventProjection;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.EventProjectionStore;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewCaseDraft;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewCaseMergeResult;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewCaseSplitResult;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewCaseTimelineItem;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewCaseView;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewEvidenceAuditEntry;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewEvidenceExportJob;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewEvidenceExportPackage;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewEvidenceItem;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewItemAggregate;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewItemDraft;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewItemStore;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewQuery;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewRuleCommand;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewRuleStore;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewRuleView;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewRuntimeOutboxMessage;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewSemanticIndexEntry;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewUserStatusView;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.dao.DuplicateKeyException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
public class SupervisionAlertReviewMapperStore implements ReviewItemStore, ReviewRuleStore, EventProjectionStore {

    private static final String REVIEW_ITEM_NO_PREFIX = "RI-";
    private static final String REVIEW_CASE_NO_PREFIX = "RC-";
    private static final String SOURCE_ALERT_ID_SEPARATOR = "\n";
    private static final String CSV_SEPARATOR = ",";
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {
    };

    private final SupervisionAlertReviewItemMapper reviewItemMapper;
    private final SupervisionAlertReviewEvidenceMapper reviewEvidenceMapper;
    private final SupervisionAlertReviewIngestIdentityMapper reviewIngestIdentityMapper;
    private final SupervisionAlertReviewRuleMapper reviewRuleMapper;
    private final SupervisionAlertReviewCaseMapper reviewCaseMapper;
    private final SupervisionAlertReviewCaseItemMapper reviewCaseItemMapper;
    private final SupervisionAlertReviewCaseAuditMapper reviewCaseAuditMapper;
    private final SupervisionAlertReviewExportJobMapper reviewExportJobMapper;
    private final SupervisionAlertReviewSemanticIndexMapper reviewSemanticIndexMapper;
    private final SupervisionAlertReviewUserStatusMapper reviewUserStatusMapper;
    private final SupervisionAlertReviewRuntimeLockMapper reviewRuntimeLockMapper;
    private final SupervisionAlertReviewRuntimeRunMapper reviewRuntimeRunMapper;
    private final SupervisionAlertReviewRuntimeOutboxMapper reviewRuntimeOutboxMapper;
    private final SupervisionAlertReviewSegmentMapper reviewSegmentMapper;
    private final SupervisionEventMapper supervisionEventMapper;

    public SupervisionAlertReviewMapperStore(SupervisionAlertReviewItemMapper reviewItemMapper,
                                             SupervisionAlertReviewEvidenceMapper reviewEvidenceMapper,
                                             SupervisionAlertReviewIngestIdentityMapper reviewIngestIdentityMapper,
                                             SupervisionAlertReviewRuleMapper reviewRuleMapper,
                                             SupervisionAlertReviewCaseMapper reviewCaseMapper,
                                             SupervisionAlertReviewCaseItemMapper reviewCaseItemMapper,
                                             SupervisionAlertReviewCaseAuditMapper reviewCaseAuditMapper,
                                             SupervisionAlertReviewExportJobMapper reviewExportJobMapper,
                                             SupervisionAlertReviewSemanticIndexMapper reviewSemanticIndexMapper,
                                             SupervisionAlertReviewUserStatusMapper reviewUserStatusMapper,
                                             SupervisionAlertReviewRuntimeLockMapper reviewRuntimeLockMapper,
                                             SupervisionAlertReviewRuntimeRunMapper reviewRuntimeRunMapper,
                                             SupervisionAlertReviewRuntimeOutboxMapper reviewRuntimeOutboxMapper,
                                             SupervisionAlertReviewSegmentMapper reviewSegmentMapper,
                                             SupervisionEventMapper supervisionEventMapper) {
        this.reviewItemMapper = Objects.requireNonNull(reviewItemMapper, "reviewItemMapper");
        this.reviewEvidenceMapper = Objects.requireNonNull(reviewEvidenceMapper, "reviewEvidenceMapper");
        this.reviewIngestIdentityMapper = Objects.requireNonNull(reviewIngestIdentityMapper, "reviewIngestIdentityMapper");
        this.reviewRuleMapper = Objects.requireNonNull(reviewRuleMapper, "reviewRuleMapper");
        this.reviewCaseMapper = Objects.requireNonNull(reviewCaseMapper, "reviewCaseMapper");
        this.reviewCaseItemMapper = Objects.requireNonNull(reviewCaseItemMapper, "reviewCaseItemMapper");
        this.reviewCaseAuditMapper = Objects.requireNonNull(reviewCaseAuditMapper, "reviewCaseAuditMapper");
        this.reviewExportJobMapper = Objects.requireNonNull(reviewExportJobMapper, "reviewExportJobMapper");
        this.reviewSemanticIndexMapper = Objects.requireNonNull(reviewSemanticIndexMapper, "reviewSemanticIndexMapper");
        this.reviewUserStatusMapper = Objects.requireNonNull(reviewUserStatusMapper, "reviewUserStatusMapper");
        this.reviewRuntimeLockMapper = Objects.requireNonNull(reviewRuntimeLockMapper, "reviewRuntimeLockMapper");
        this.reviewRuntimeRunMapper = Objects.requireNonNull(reviewRuntimeRunMapper, "reviewRuntimeRunMapper");
        this.reviewRuntimeOutboxMapper = Objects.requireNonNull(reviewRuntimeOutboxMapper, "reviewRuntimeOutboxMapper");
        this.reviewSegmentMapper = Objects.requireNonNull(reviewSegmentMapper, "reviewSegmentMapper");
        this.supervisionEventMapper = Objects.requireNonNull(supervisionEventMapper, "supervisionEventMapper");
    }

    @Override
    public Optional<ReviewItemAggregate> findMergeCandidate(String sourceSystem,
                                                            String cameraId,
                                                            String zoneCode,
                                                            String ruleCode,
                                                            LocalDateTime windowStart,
                                                            LocalDateTime windowEnd) {
        return Optional.ofNullable(reviewItemMapper.selectMergeCandidate(
                        TenantContextHolder.getTenantId(),
                        sourceSystem,
                        cameraId,
                        zoneCode,
                        ruleCode,
                        windowStart,
                        windowEnd
                ))
                .map(this::toAggregate);
    }

    @Override
    public Optional<ReviewItemAggregate> findByIngestIdentity(String sourceSystem,
                                                             String sourceAlertId,
                                                             List<String> identityKeys) {
        Long tenantId = reviewIdentityTenantId(TenantContextHolder.getTenantId());
        for (String identityKey : ingestIdentityLookupKeys(sourceSystem, sourceAlertId, identityKeys, null)) {
            SupervisionAlertReviewIngestIdentityDO identityDO =
                    reviewIngestIdentityMapper.selectByIdentity(tenantId, sourceSystem, identityKey);
            if (identityDO != null) {
                return findById(identityDO.getReviewItemId());
            }
        }
        return Optional.empty();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ReviewItemAggregate create(ReviewItemDraft draft, List<ReviewEvidenceItem> evidenceItems) {
        Objects.requireNonNull(draft, "draft");
        SupervisionAlertReviewItemDO itemDO = new SupervisionAlertReviewItemDO()
                .setTenantId(TenantContextHolder.getTenantId())
                .setReviewItemNo(newReviewItemNo())
                .setSourceSystem(draft.sourceSystem())
                .setRuleCode(draft.ruleCode())
                .setSourceAlertType(draft.sourceAlertType())
                .setDeviceId(draft.deviceId())
                .setCameraId(draft.cameraId())
                .setZoneCode(draft.zoneCode())
                .setObjectLabel(draft.objectLabel())
                .setFirstAlertTime(draft.alertTime())
                .setLastAlertTime(draft.alertTime())
                .setAlertCount(1)
                .setSourceAlertIds(joinSourceAlertIds(List.of(draft.sourceAlertId())))
                .setReviewData(writeJson(draft.reviewData()))
                .setReviewStatus(SupervisionAlertReviewService.STATUS_PENDING_REVIEW)
                .setRecordEvidenceStatus(draft.recordEvidenceStatus())
                .setRecordEvidenceCheckedAt(draft.recordEvidenceCheckedAt())
                .setRecordEvidenceMessage(draft.recordEvidenceMessage())
                .setVersion(0);
        reviewItemMapper.insert(itemDO);
        insertEvidence(itemDO.getId(), evidenceItems);
        insertIngestIdentities(itemDO, draft.sourceAlertId(), draft.sourcePayloadHash(), draft.reviewData());
        upsertReviewSegment(itemDO);
        return toAggregate(itemDO);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ReviewItemAggregate appendClue(Long reviewItemId,
                                          String sourceAlertId,
                                          LocalDateTime alertTime,
                                          List<ReviewEvidenceItem> evidenceItems,
                                          Map<String, Object> reviewData,
                                          String recordEvidenceStatus,
                                          LocalDateTime recordEvidenceCheckedAt,
                                          String recordEvidenceMessage) {
        SupervisionAlertReviewItemDO itemDO = requireItem(reviewItemId);
        List<String> sourceAlertIds = new ArrayList<>(splitSourceAlertIds(itemDO.getSourceAlertIds()));
        if (!sourceAlertIds.contains(sourceAlertId)) {
            sourceAlertIds.add(sourceAlertId);
        }
        List<String> orderedSourceAlertIds = toStringList(toStringObjectMap(reviewData == null ? null : reviewData.get("reviewSegment")).get("sourceAlertIds"));
        if (!orderedSourceAlertIds.isEmpty()) {
            sourceAlertIds = orderedSourceAlertIds;
        }
        itemDO.setFirstAlertTime(min(itemDO.getFirstAlertTime(), alertTime))
                .setLastAlertTime(max(itemDO.getLastAlertTime(), alertTime))
                .setAlertCount(sourceAlertIds.size())
                .setSourceAlertIds(joinSourceAlertIds(sourceAlertIds))
                .setReviewData(writeJson(reviewData))
                .setRecordEvidenceStatus(recordEvidenceStatus)
                .setRecordEvidenceCheckedAt(recordEvidenceCheckedAt)
                .setRecordEvidenceMessage(recordEvidenceMessage);
        reviewItemMapper.updateById(itemDO);
        insertEvidence(reviewItemId, evidenceItems);
        insertIngestIdentities(itemDO, sourceAlertId, toText(reviewData == null ? null : reviewData.get("sourcePayloadHash"), null), reviewData);
        upsertReviewSegment(itemDO);
        return toAggregate(itemDO);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ReviewItemAggregate appendEvidence(Long reviewItemId, List<ReviewEvidenceItem> evidenceItems) {
        SupervisionAlertReviewItemDO itemDO = requireItem(reviewItemId);
        insertEvidence(reviewItemId, evidenceItems);
        return toAggregate(itemDO);
    }

    @Override
    public ReviewItemAggregate updateRecordEvidenceStatus(Long reviewItemId,
                                                          String recordEvidenceStatus,
                                                          LocalDateTime recordEvidenceCheckedAt,
                                                          String recordEvidenceMessage) {
        SupervisionAlertReviewItemDO itemDO = requireItem(reviewItemId);
        itemDO.setRecordEvidenceStatus(recordEvidenceStatus)
                .setRecordEvidenceCheckedAt(recordEvidenceCheckedAt)
                .setRecordEvidenceMessage(recordEvidenceMessage);
        reviewItemMapper.updateById(itemDO);
        return toAggregate(itemDO);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ReviewItemAggregate updateReviewLifecycle(Long reviewItemId,
                                                     Map<String, Object> reviewData,
                                                     LocalDateTime firstAlertTime,
                                                     LocalDateTime lastAlertTime,
                                                     List<ReviewEvidenceItem> evidenceItems,
                                                     String recordEvidenceStatus,
                                                     LocalDateTime recordEvidenceCheckedAt,
                                                     String recordEvidenceMessage) {
        SupervisionAlertReviewItemDO itemDO = requireItem(reviewItemId);
        itemDO.setReviewData(writeJson(reviewData))
                .setFirstAlertTime(firstAlertTime)
                .setLastAlertTime(lastAlertTime)
                .setRecordEvidenceStatus(recordEvidenceStatus)
                .setRecordEvidenceCheckedAt(recordEvidenceCheckedAt)
                .setRecordEvidenceMessage(recordEvidenceMessage);
        reviewItemMapper.updateById(itemDO);
        insertEvidence(reviewItemId, evidenceItems);
        upsertReviewSegment(itemDO);
        return toAggregate(itemDO);
    }

    @Override
    public Optional<ReviewItemAggregate> findById(Long reviewItemId) {
        return Optional.ofNullable(reviewItemMapper.selectById(reviewItemId)).map(this::toAggregate);
    }

    @Override
    public List<ReviewItemAggregate> listWorkbench(ReviewQuery query) {
        String reviewStatus = query == null ? null : query.reviewStatus();
        String cameraId = query == null ? null : query.cameraId();
        LocalDateTime beginTime = query == null ? null : query.beginTime();
        LocalDateTime endTime = query == null ? null : query.endTime();
        return reviewItemMapper.selectWorkbench(TenantContextHolder.getTenantId(), reviewStatus, cameraId, beginTime, endTime)
                .stream()
                .map(this::toAggregate)
                .toList();
    }

    @Override
    public List<ReviewEvidenceItem> listTimeline(Long reviewItemId) {
        return reviewEvidenceMapper.selectByReviewItemId(reviewItemId)
                .stream()
                .map(this::toEvidenceItem)
                .toList();
    }

    @Override
    public ReviewItemAggregate updateReviewStatus(Long reviewItemId,
                                                  String reviewStatus,
                                                  Long reviewerUserId,
                                                  String ignoreReason,
                                                  LocalDateTime reviewedAt) {
        SupervisionAlertReviewItemDO itemDO = requireItem(reviewItemId);
        String expectedStatus = itemDO.getReviewStatus();
        Integer expectedVersion = itemDO.getVersion();
        Integer nextVersion = nextVersion(expectedVersion);
        itemDO.setReviewStatus(reviewStatus)
                .setReviewerUserId(reviewerUserId)
                .setReviewedAt(reviewedAt)
                .setIgnoreReason(ignoreReason)
                .setVersion(nextVersion);
        SupervisionAlertReviewItemDO updateDO = new SupervisionAlertReviewItemDO()
                .setReviewStatus(reviewStatus)
                .setReviewerUserId(reviewerUserId)
                .setReviewedAt(reviewedAt)
                .setIgnoreReason(ignoreReason)
                .setVersion(nextVersion);
        int updated = reviewItemMapper.updateReviewStatusIfCurrent(
                reviewItemId,
                expectedStatus,
                expectedVersion,
                updateDO
        );
        if (updated == 0) {
            return resolveConcurrentReviewStatusMiss(reviewItemId, reviewStatus);
        }
        return toAggregate(itemDO);
    }

    @Override
    public ReviewUserStatusView upsertUserReviewStatus(Long reviewItemId,
                                                       Long userId,
                                                       boolean hasBeenReviewed,
                                                       LocalDateTime reviewedAt) {
        requireItem(reviewItemId);
        SupervisionAlertReviewUserStatusDO statusDO =
                reviewUserStatusMapper.selectByReviewItemAndUser(reviewItemId, userId);
        if (statusDO == null) {
            statusDO = new SupervisionAlertReviewUserStatusDO()
                    .setReviewItemId(reviewItemId)
                    .setUserId(userId)
                    .setHasBeenReviewed(hasBeenReviewed)
                    .setReviewedAt(reviewedAt)
                    .setVersion(0);
            reviewUserStatusMapper.insert(statusDO);
            return toUserStatusView(statusDO);
        }
        statusDO.setHasBeenReviewed(hasBeenReviewed)
                .setReviewedAt(reviewedAt);
        reviewUserStatusMapper.updateById(statusDO);
        return toUserStatusView(statusDO);
    }

    @Override
    public Optional<ReviewUserStatusView> findUserReviewStatus(Long reviewItemId, Long userId) {
        if (reviewItemId == null || userId == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(reviewUserStatusMapper.selectByReviewItemAndUser(reviewItemId, userId))
                .map(this::toUserStatusView);
    }

    @Override
    public long countReviewedByUser(List<Long> reviewItemIds, Long userId) {
        if (reviewItemIds == null || reviewItemIds.isEmpty() || userId == null) {
            return 0L;
        }
        Long count = reviewUserStatusMapper.selectReviewedCountByUser(reviewItemIds, userId);
        return count == null ? 0L : count;
    }

    @Override
    public ReviewItemAggregate updateFalsePositive(Long reviewItemId,
                                                   Long reviewerUserId,
                                                   String reason,
                                                   Map<String, Object> ruleSuggestion,
                                                   LocalDateTime reviewedAt) {
        SupervisionAlertReviewItemDO itemDO = requireItem(reviewItemId);
        String expectedStatus = itemDO.getReviewStatus();
        Integer expectedVersion = itemDO.getVersion();
        Integer nextVersion = nextVersion(expectedVersion);
        itemDO.setReviewStatus(SupervisionAlertReviewService.STATUS_FALSE_POSITIVE)
                .setReviewerUserId(reviewerUserId)
                .setReviewedAt(reviewedAt)
                .setIgnoreReason(reason)
                .setRuleSuggestion(writeJson(ruleSuggestion))
                .setRuleSuggestionStatus(SupervisionAlertReviewService.RULE_SUGGESTION_PENDING)
                .setRuleSuggestionUpdatedAt(reviewedAt)
                .setVersion(nextVersion);
        SupervisionAlertReviewItemDO updateDO = new SupervisionAlertReviewItemDO()
                .setReviewStatus(SupervisionAlertReviewService.STATUS_FALSE_POSITIVE)
                .setReviewerUserId(reviewerUserId)
                .setReviewedAt(reviewedAt)
                .setIgnoreReason(reason)
                .setRuleSuggestion(writeJson(ruleSuggestion))
                .setRuleSuggestionStatus(SupervisionAlertReviewService.RULE_SUGGESTION_PENDING)
                .setRuleSuggestionUpdatedAt(reviewedAt)
                .setVersion(nextVersion);
        int updated = reviewItemMapper.updateReviewStatusIfCurrent(
                reviewItemId,
                expectedStatus,
                expectedVersion,
                updateDO
        );
        if (updated == 0) {
            return resolveConcurrentReviewStatusMiss(reviewItemId, SupervisionAlertReviewService.STATUS_FALSE_POSITIVE);
        }
        return toAggregate(itemDO);
    }

    @Override
    public ReviewItemAggregate updateRuleSuggestionStatus(Long reviewItemId,
                                                          Long reviewerUserId,
                                                          String status,
                                                          Map<String, Object> ruleSuggestion,
                                                          LocalDateTime updatedAt) {
        SupervisionAlertReviewItemDO itemDO = requireItem(reviewItemId);
        itemDO.setReviewerUserId(reviewerUserId)
                .setRuleSuggestion(writeJson(ruleSuggestion))
                .setRuleSuggestionStatus(status)
                .setRuleSuggestionUpdatedAt(updatedAt);
        reviewItemMapper.updateById(itemDO);
        return toAggregate(itemDO);
    }

    @Override
    public ReviewItemAggregate markConverted(Long reviewItemId,
                                             Long reviewerUserId,
                                             Long eventId,
                                             LocalDateTime convertedAt) {
        SupervisionAlertReviewItemDO itemDO = requireItem(reviewItemId);
        itemDO.setReviewStatus(SupervisionAlertReviewService.STATUS_CONVERTED)
                .setReviewerUserId(reviewerUserId)
                .setReviewedAt(convertedAt)
                .setEventId(eventId)
                .setConvertedAt(convertedAt);
        reviewItemMapper.updateById(itemDO);
        return toAggregate(itemDO);
    }

    @Override
    public ReviewItemAggregate updateEventProjection(Long reviewItemId,
                                                     Map<String, Object> reviewData,
                                                     EventProjection projection,
                                                     String eventReviewStatus,
                                                     LocalDateTime reconciledAt) {
        SupervisionAlertReviewItemDO itemDO = requireItem(reviewItemId);
        itemDO.setReviewData(writeJson(reviewData));
        reviewItemMapper.updateById(itemDO);
        return toAggregate(itemDO);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ReviewCaseView createCase(ReviewCaseDraft draft, List<Long> reviewItemIds) {
        Objects.requireNonNull(draft, "draft");
        List<SupervisionAlertReviewItemDO> items = requireItems(reviewItemIds);
        SupervisionAlertReviewCaseDO caseDO = new SupervisionAlertReviewCaseDO()
                .setCaseNo(newReviewCaseNo())
                .setTitle(hasText(draft.title()) ? draft.title() : "review-case")
                .setStatus(SupervisionAlertReviewService.REVIEW_CASE_OPEN)
                .setPrimaryReviewItemId(draft.primaryReviewItemId())
                .setOwnerUserId(draft.ownerUserId())
                .setNotes(draft.notes())
                .setVersion(0);
        fillCaseSummary(caseDO, items);
        reviewCaseMapper.insert(caseDO);
        insertCaseItems(caseDO.getId(), reviewItemIds);
        insertCaseAudit(caseDO.getId(), draft.primaryReviewItemId(), "create_case", draft.notes(), draft.ownerUserId());
        return toCaseView(caseDO);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ReviewCaseView addCaseItem(Long reviewCaseId, Long reviewItemId) {
        SupervisionAlertReviewCaseDO caseDO = requireCase(reviewCaseId);
        ensureCaseOpen(caseDO);
        requireItem(reviewItemId);
        if (reviewCaseItemMapper.selectExisting(reviewCaseId, reviewItemId) == null) {
            int nextSortOrder = reviewCaseItemMapper.selectByCaseId(reviewCaseId).size() + 1;
            reviewCaseItemMapper.insert(new SupervisionAlertReviewCaseItemDO()
                    .setReviewCaseId(reviewCaseId)
                    .setReviewItemId(reviewItemId)
                    .setSortOrder(nextSortOrder)
                    .setAddedAt(LocalDateTime.now())
                    .setVersion(0));
            insertCaseAudit(reviewCaseId, reviewItemId, "add_item", null, null);
        }
        List<Long> reviewItemIds = reviewCaseItemMapper.selectByCaseId(reviewCaseId)
                .stream()
                .map(SupervisionAlertReviewCaseItemDO::getReviewItemId)
                .toList();
        fillCaseSummary(caseDO, requireItems(reviewItemIds));
        reviewCaseMapper.updateById(caseDO);
        return toCaseView(caseDO);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ReviewCaseView updateCaseOwner(Long reviewCaseId,
                                          Long ownerUserId,
                                          String notes,
                                          Long operatorUserId) {
        SupervisionAlertReviewCaseDO caseDO = requireCase(reviewCaseId);
        ensureCaseOpen(caseDO);
        caseDO.setOwnerUserId(ownerUserId);
        if (hasText(notes)) {
            caseDO.setNotes(notes);
        }
        reviewCaseMapper.updateById(caseDO);
        insertCaseAudit(reviewCaseId, null, "assign_owner", caseOwnerAuditNote(ownerUserId, notes), operatorUserId);
        return toCaseView(caseDO);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ReviewCaseView closeCase(Long reviewCaseId,
                                    String notes,
                                    Long operatorUserId,
                                    LocalDateTime closedAt) {
        SupervisionAlertReviewCaseDO caseDO = requireCase(reviewCaseId);
        if (!SupervisionAlertReviewService.REVIEW_CASE_CLOSED.equals(caseDO.getStatus())) {
            caseDO.setStatus(SupervisionAlertReviewService.REVIEW_CASE_CLOSED);
            if (hasText(notes)) {
                caseDO.setNotes(notes);
            }
            reviewCaseMapper.updateById(caseDO);
            insertCaseAudit(reviewCaseId, null, "close_case", caseNotesAuditNote(notes), operatorUserId);
        }
        return toCaseView(caseDO);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ReviewCaseMergeResult mergeCases(Long targetReviewCaseId,
                                            Long sourceReviewCaseId,
                                            Long operatorUserId,
                                            String notes) {
        if (Objects.equals(targetReviewCaseId, sourceReviewCaseId)) {
            throw new IllegalArgumentException("sourceReviewCaseId must differ from targetReviewCaseId");
        }
        SupervisionAlertReviewCaseDO targetCaseDO = requireCase(targetReviewCaseId);
        SupervisionAlertReviewCaseDO sourceCaseDO = requireCase(sourceReviewCaseId);
        ensureCaseOpen(targetCaseDO);
        ensureCaseOpen(sourceCaseDO);
        List<SupervisionAlertReviewCaseItemDO> targetCaseItems = reviewCaseItemMapper.selectByCaseId(targetReviewCaseId);
        List<SupervisionAlertReviewCaseItemDO> sourceCaseItems = reviewCaseItemMapper.selectByCaseId(sourceReviewCaseId);
        if (sourceCaseItems.isEmpty()) {
            throw new IllegalStateException("source review case has no clues: " + sourceReviewCaseId);
        }
        LinkedHashSet<Long> targetReviewItemIds = new LinkedHashSet<>();
        for (SupervisionAlertReviewCaseItemDO targetCaseItem : targetCaseItems) {
            targetReviewItemIds.add(targetCaseItem.getReviewItemId());
        }
        int nextSortOrder = targetCaseItems.size() + 1;
        for (SupervisionAlertReviewCaseItemDO sourceCaseItem : sourceCaseItems) {
            Long reviewItemId = sourceCaseItem.getReviewItemId();
            if (targetReviewItemIds.add(reviewItemId)) {
                reviewCaseItemMapper.insert(new SupervisionAlertReviewCaseItemDO()
                        .setReviewCaseId(targetReviewCaseId)
                        .setReviewItemId(reviewItemId)
                        .setSortOrder(nextSortOrder++)
                        .setAddedAt(LocalDateTime.now())
                        .setVersion(0));
            }
        }
        for (SupervisionAlertReviewCaseItemDO sourceCaseItem : sourceCaseItems) {
            reviewCaseItemMapper.deleteById(sourceCaseItem.getId());
        }
        fillCaseSummary(targetCaseDO, requireItems(List.copyOf(targetReviewItemIds)));
        sourceCaseDO.setStatus(SupervisionAlertReviewService.REVIEW_CASE_MERGED)
                .setCameraIds(null)
                .setStartTime(null)
                .setEndTime(null);
        if (hasText(notes)) {
            sourceCaseDO.setNotes(notes);
        }
        reviewCaseMapper.updateById(targetCaseDO);
        reviewCaseMapper.updateById(sourceCaseDO);
        insertCaseAudit(targetReviewCaseId, null, "merge_case", caseRelatedAuditNote("sourceReviewCaseId", sourceReviewCaseId, null, notes), operatorUserId);
        insertCaseAudit(sourceReviewCaseId, null, "merge_case", caseRelatedAuditNote("targetReviewCaseId", targetReviewCaseId, null, notes), operatorUserId);
        return new ReviewCaseMergeResult(toCaseView(targetCaseDO), toCaseView(sourceCaseDO));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ReviewCaseSplitResult splitCase(Long sourceReviewCaseId,
                                           ReviewCaseDraft draft,
                                           List<Long> reviewItemIds,
                                           Long operatorUserId) {
        Objects.requireNonNull(draft, "draft");
        SupervisionAlertReviewCaseDO sourceCaseDO = requireCase(sourceReviewCaseId);
        ensureCaseOpen(sourceCaseDO);
        List<SupervisionAlertReviewCaseItemDO> sourceCaseItems = reviewCaseItemMapper.selectByCaseId(sourceReviewCaseId);
        LinkedHashSet<Long> sourceReviewItemIds = new LinkedHashSet<>();
        for (SupervisionAlertReviewCaseItemDO sourceCaseItem : sourceCaseItems) {
            sourceReviewItemIds.add(sourceCaseItem.getReviewItemId());
        }
        LinkedHashSet<Long> splitReviewItemIds = new LinkedHashSet<>(reviewItemIds == null ? List.of() : reviewItemIds);
        if (splitReviewItemIds.isEmpty()) {
            throw new IllegalArgumentException("reviewItemIds must not be empty");
        }
        if (!sourceReviewItemIds.containsAll(splitReviewItemIds)) {
            throw new IllegalArgumentException("reviewItemIds must belong to source review case");
        }
        if (sourceReviewItemIds.size() == splitReviewItemIds.size()) {
            throw new IllegalArgumentException("split must leave at least one clue in source review case");
        }
        ReviewCaseView newCase = createCase(draft, List.copyOf(splitReviewItemIds));
        for (SupervisionAlertReviewCaseItemDO sourceCaseItem : sourceCaseItems) {
            if (splitReviewItemIds.contains(sourceCaseItem.getReviewItemId())) {
                reviewCaseItemMapper.deleteById(sourceCaseItem.getId());
            }
        }
        List<Long> remainingReviewItemIds = sourceReviewItemIds.stream()
                .filter(reviewItemId -> !splitReviewItemIds.contains(reviewItemId))
                .toList();
        if (splitReviewItemIds.contains(sourceCaseDO.getPrimaryReviewItemId())) {
            sourceCaseDO.setPrimaryReviewItemId(remainingReviewItemIds.get(0));
        }
        fillCaseSummary(sourceCaseDO, requireItems(remainingReviewItemIds));
        reviewCaseMapper.updateById(sourceCaseDO);
        insertCaseAudit(sourceReviewCaseId, null, "split_case", caseRelatedAuditNote("newReviewCaseId", newCase.id(), splitReviewItemIds, draft.notes()), operatorUserId);
        insertCaseAudit(newCase.id(), null, "split_case", caseRelatedAuditNote("sourceReviewCaseId", sourceReviewCaseId, splitReviewItemIds, draft.notes()), operatorUserId);
        return new ReviewCaseSplitResult(toCaseView(sourceCaseDO), toCaseView(requireCase(newCase.id())));
    }

    @Override
    public List<ReviewCaseTimelineItem> listCaseTimeline(Long reviewCaseId) {
        requireCase(reviewCaseId);
        List<ReviewCaseTimelineItem> timeline = new ArrayList<>();
        for (SupervisionAlertReviewCaseItemDO caseItemDO : reviewCaseItemMapper.selectByCaseId(reviewCaseId)) {
            SupervisionAlertReviewItemDO itemDO = requireItem(caseItemDO.getReviewItemId());
            for (ReviewEvidenceItem evidenceItem : listTimeline(caseItemDO.getReviewItemId())) {
                timeline.add(new ReviewCaseTimelineItem(
                        reviewCaseId,
                        caseItemDO.getReviewItemId(),
                        itemDO.getCameraId(),
                        evidenceItem.sourceAlertId(),
                        evidenceItem.materialType(),
                        evidenceItem.materialUri(),
                        evidenceItem.happenedAt()
                ));
            }
        }
        for (SupervisionAlertReviewCaseAuditDO auditDO : reviewCaseAuditMapper.selectByCaseId(reviewCaseId)) {
            timeline.add(new ReviewCaseTimelineItem(
                    reviewCaseId,
                    auditDO.getReviewItemId(),
                    null,
                    null,
                    "case_audit",
                    auditDO.getActionType(),
                    auditDO.getHappenedAt(),
                    auditDO.getActionNote()
            ));
        }
        return timeline;
    }

    @Override
    public void recordCaseAudit(Long reviewCaseId,
                                Long reviewItemId,
                                String actionType,
                                String actionNote,
                                Long operatorUserId,
                                LocalDateTime happenedAt,
                                Map<String, Object> metadata) {
        requireCase(reviewCaseId);
        if (reviewItemId != null) {
            requireItem(reviewItemId);
        }
        insertCaseAudit(reviewCaseId, reviewItemId, actionType, actionNote, operatorUserId, happenedAt, metadata);
    }

    @Override
    public ReviewSemanticIndexEntry upsertSemanticIndex(ReviewItemAggregate item,
                                                       String document,
                                                       String embeddingKey,
                                                       String embeddingModel,
                                                       String embeddingVectorHash,
                                                       String indexStatus,
                                                       Integer retryCount,
                                                       String lastError,
                                                       LocalDateTime indexedAt) {
        Objects.requireNonNull(item, "item");
        SupervisionAlertReviewSemanticIndexDO indexDO = reviewSemanticIndexMapper.selectByReviewItemId(item.id());
        if (indexDO == null) {
            indexDO = new SupervisionAlertReviewSemanticIndexDO()
                    .setReviewItemId(item.id())
                    .setVersion(0);
        }
        indexDO.setCameraId(item.cameraId())
                .setFirstAlertTime(item.firstAlertTime())
                .setLastAlertTime(item.lastAlertTime())
                .setIndexStatus(indexStatus)
                .setDocument(document)
                .setEmbeddingKey(embeddingKey)
                .setEmbeddingModel(embeddingModel)
                .setEmbeddingVectorHash(embeddingVectorHash)
                .setRetryCount(retryCount == null ? 0 : retryCount)
                .setLastError(lastError)
                .setIndexedAt(indexedAt)
                .setVersion((indexDO.getVersion() == null ? 0 : indexDO.getVersion()) + 1);
        if (indexDO.getId() == null) {
            reviewSemanticIndexMapper.insert(indexDO);
        } else {
            reviewSemanticIndexMapper.updateById(indexDO);
        }
        return toSemanticIndexEntry(indexDO);
    }

    @Override
    public List<ReviewSemanticIndexEntry> listSemanticIndex(ReviewQuery query) {
        List<Long> reviewItemIds = listWorkbench(query).stream()
                .map(ReviewItemAggregate::id)
                .toList();
        return reviewSemanticIndexMapper.selectByReviewItemIds(reviewItemIds)
                .stream()
                .map(this::toSemanticIndexEntry)
                .toList();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ReviewEvidenceExportJob createExportJob(ReviewEvidenceExportPackage exportPackage,
                                                   Long operatorUserId,
                                                   String reason,
                                                   List<Long> boundEventIds,
                                                   String fileHash,
                                                   LocalDateTime expiresAt,
                                                   LocalDateTime createdAt) {
        Objects.requireNonNull(exportPackage, "exportPackage");
        requireCase(exportPackage.reviewCaseId());
        String jobNo = "REJ-" + UUID.randomUUID();
        SupervisionAlertReviewExportJobDO jobDO = new SupervisionAlertReviewExportJobDO()
                .setJobNo(jobNo)
                .setStatus(SupervisionAlertReviewService.EXPORT_JOB_READY)
                .setPackageNo(exportPackage.packageNo())
                .setReviewCaseId(exportPackage.reviewCaseId())
                .setReviewItemIds(joinLongCsv(exportPackage.reviewItemIds()))
                .setEvidenceUris(joinCsv(exportPackage.evidenceUris()))
                .setManifest(writeJson(exportPackage.manifest()))
                .setFileHash(fileHash)
                .setExpiresAt(expiresAt)
                .setOperatorUserId(operatorUserId)
                .setExportReason(reason)
                .setBoundEventIds(joinLongCsv(boundEventIds))
                .setGeneratedAt(createdAt)
                .setVersion(0);
        reviewExportJobMapper.insert(jobDO);
        insertCaseAudit(
                exportPackage.reviewCaseId(),
                null,
                "export_evidence_job",
                exportAuditNote(jobNo, fileHash, reason),
                operatorUserId
        );
        return new ReviewEvidenceExportJob(
                jobNo,
                SupervisionAlertReviewService.EXPORT_JOB_READY,
                exportPackage,
                fileHash,
                expiresAt,
                operatorUserId,
                reason,
                boundEventIds == null ? List.of() : List.copyOf(boundEventIds),
                createdAt
        );
    }

    @Override
    public List<ReviewEvidenceExportJob> listExportJobs(Long reviewCaseId) {
        requireCase(reviewCaseId);
        return reviewExportJobMapper.selectByReviewCaseId(reviewCaseId)
                .stream()
                .map(this::toExportJob)
                .toList();
    }

    @Override
    public List<ReviewEvidenceExportJob> listAllExportJobs() {
        return reviewExportJobMapper.selectAll()
                .stream()
                .map(this::toExportJob)
                .toList();
    }

    @Override
    public Optional<ReviewEvidenceExportJob> findExportJobByNo(String jobNo) {
        if (jobNo == null || jobNo.isBlank()) {
            return Optional.empty();
        }
        return Optional.ofNullable(reviewExportJobMapper.selectByJobNo(jobNo))
                .map(this::toExportJob);
    }

    @Override
    public ReviewEvidenceAuditEntry recordEvidenceDownload(String jobNo,
                                                           Long operatorUserId,
                                                           String reason,
                                                           LocalDateTime happenedAt) {
        SupervisionAlertReviewExportJobDO jobDO = reviewExportJobMapper.selectByJobNo(jobNo);
        if (jobDO == null) {
            throw new IllegalArgumentException("export job not found: " + jobNo);
        }
        String note = exportDownloadAuditNote(jobNo, jobDO.getFileHash(), operatorUserId, reason);
        insertCaseAudit(jobDO.getReviewCaseId(), null, "export_downloaded", note, operatorUserId);
        return new ReviewEvidenceAuditEntry(
                jobDO.getReviewCaseId(),
                null,
                "export_downloaded",
                jobNo,
                jobDO.getFileHash(),
                operatorUserId,
                reason,
                splitCsv(jobDO.getEvidenceUris()),
                splitLongCsv(jobDO.getBoundEventIds()),
                happenedAt == null ? LocalDateTime.now() : happenedAt,
                Map.of("status", jobDO.getStatus())
        );
    }

    @Override
    public void recordCaseAudit(Long reviewCaseId,
                                Long reviewItemId,
                                String actionType,
                                String actionNote,
                                Long operatorUserId,
                                LocalDateTime happenedAt) {
        recordCaseAudit(reviewCaseId, reviewItemId, actionType, actionNote, operatorUserId, happenedAt, Map.of());
    }

    @Override
    public ReviewRuleView save(ReviewRuleCommand command) {
        SupervisionAlertReviewRuleDO ruleDO = new SupervisionAlertReviewRuleDO()
                .setId(command.id())
                .setRuleCode(command.ruleCode())
                .setRuleName(command.ruleName())
                .setSourceSystem(command.sourceSystem())
                .setCameraId(command.cameraId())
                .setZoneCode(command.zoneCode())
                .setObjectLabel(command.objectLabel())
                .setMinStaySeconds(command.minStaySeconds())
                .setInertiaFrames(command.inertiaFrames())
                .setLoiteringSeconds(command.loiteringSeconds())
                .setActiveStart(command.activeStart())
                .setActiveEnd(command.activeEnd())
                .setEnabled(command.enabled() == null || command.enabled())
                .setVersion(0);
        if (ruleDO.getId() == null) {
            reviewRuleMapper.insert(ruleDO);
        } else {
            reviewRuleMapper.updateById(ruleDO);
        }
        return toRuleView(ruleDO);
    }

    @Override
    public List<ReviewRuleView> listEnabled() {
        return reviewRuleMapper.selectEnabled().stream().map(this::toRuleView).toList();
    }

    @Override
    public List<ReviewRuleView> listAll() {
        return reviewRuleMapper.selectAllOrdered().stream().map(this::toRuleView).toList();
    }

    @Override
    public Optional<EventProjection> findByEventId(Long eventId) {
        if (eventId == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(supervisionEventMapper.selectById(eventId))
                .map(this::toEventProjection);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean tryAcquireRuntimePatrolLock(String lockName, LocalDateTime expiresAt, Long operatorUserId) {
        if (!hasText(lockName)) {
            return false;
        }
        LocalDateTime now = LocalDateTime.now();
        SupervisionAlertReviewRuntimeLockDO lockDO = reviewRuntimeLockMapper.selectByLockName(lockName);
        if (lockDO == null) {
            lockDO = new SupervisionAlertReviewRuntimeLockDO()
                    .setLockName(lockName)
                    .setOwnerUserId(operatorUserId)
                    .setLockedUntil(expiresAt)
                    .setLastLockedAt(now)
                    .setVersion(0);
            reviewRuntimeLockMapper.insert(lockDO);
            return true;
        }
        if (lockDO.getLockedUntil() != null && lockDO.getLockedUntil().isAfter(now)) {
            return false;
        }
        lockDO.setOwnerUserId(operatorUserId)
                .setLockedUntil(expiresAt)
                .setLastLockedAt(now);
        return reviewRuntimeLockMapper.updateById(lockDO) > 0;
    }

    @Override
    public void releaseRuntimePatrolLock(String lockName, Long operatorUserId) {
        if (!hasText(lockName)) {
            return;
        }
        SupervisionAlertReviewRuntimeLockDO lockDO = reviewRuntimeLockMapper.selectByLockName(lockName);
        if (lockDO == null) {
            return;
        }
        if (operatorUserId != null && lockDO.getOwnerUserId() != null
                && !Objects.equals(operatorUserId, lockDO.getOwnerUserId())) {
            return;
        }
        lockDO.setLockedUntil(LocalDateTime.now());
        reviewRuntimeLockMapper.updateById(lockDO);
    }

    @Override
    public String recordRuntimePatrolRun(String status,
                                         Integer attemptCount,
                                         List<String> alerts,
                                         List<String> recommendedActions,
                                         Long operatorUserId,
                                         LocalDateTime executedAt,
                                         Map<String, Object> metadata) {
        String runId = "RPR-" + UUID.randomUUID();
        reviewRuntimeRunMapper.insert(new SupervisionAlertReviewRuntimeRunDO()
                .setRunId(runId)
                .setStatus(status)
                .setAttemptCount(attemptCount == null ? 0 : attemptCount)
                .setAlerts(joinCsv(alerts))
                .setRecommendedActions(joinCsv(recommendedActions))
                .setOperatorUserId(operatorUserId)
                .setExecutedAt(executedAt == null ? LocalDateTime.now() : executedAt)
                .setMetadata(writeJson(metadata))
                .setVersion(0));
        return runId;
    }

    @Override
    public int enqueueRuntimePatrolAlerts(String runId,
                                          List<String> alerts,
                                          List<String> recommendedActions,
                                          Long operatorUserId,
                                          LocalDateTime executedAt,
                                          Map<String, Object> metadata) {
        if (alerts == null || alerts.isEmpty()) {
            return 0;
        }
        LocalDateTime createdAt = executedAt == null ? LocalDateTime.now() : executedAt;
        int count = 0;
        for (String alert : alerts) {
            if (!hasText(alert)) {
                continue;
            }
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("runId", runId);
            payload.put("alert", alert);
            payload.put("action", runtimeOutboxAction(alert, metadata));
            payload.put("recommendedActions", recommendedActions == null ? List.of() : recommendedActions);
            payload.put("metadata", metadata == null ? Map.of() : metadata);
            payload.entrySet().removeIf(entry -> entry.getValue() == null);
            reviewRuntimeOutboxMapper.insert(new SupervisionAlertReviewRuntimeOutboxDO()
                    .setRunId(runId)
                    .setEventType("review_runtime_alert")
                    .setAlertKey(alert)
                    .setPayload(writeJson(payload))
                    .setOutboxStatus("pending")
                    .setOperatorUserId(operatorUserId)
                    .setCreatedAt(createdAt)
                    .setRetryCount(0)
                    .setVersion(0));
            count++;
        }
        return count;
    }

    @Override
    public List<ReviewRuntimeOutboxMessage> listPendingRuntimeOutbox(Integer limit) {
        return reviewRuntimeOutboxMapper.selectPending(limit)
                .stream()
                .map(outboxDO -> new ReviewRuntimeOutboxMessage(
                        outboxDO.getId(),
                        outboxDO.getRunId(),
                        outboxDO.getEventType(),
                        outboxDO.getAlertKey(),
                        outboxDO.getPayload(),
                        outboxDO.getRetryCount(),
                        outboxDO.getCreatedAt()
                ))
                .toList();
    }

    @Override
    public void markRuntimeOutboxPublished(Long outboxId, LocalDateTime publishedAt) {
        if (outboxId == null) {
            return;
        }
        SupervisionAlertReviewRuntimeOutboxDO outboxDO = reviewRuntimeOutboxMapper.selectById(outboxId);
        if (outboxDO == null) {
            return;
        }
        outboxDO.setOutboxStatus("published")
                .setPublishedAt(publishedAt == null ? LocalDateTime.now() : publishedAt)
                .setLastError(null);
        reviewRuntimeOutboxMapper.updateById(outboxDO);
    }

    @Override
    public void markRuntimeOutboxFailed(Long outboxId, String lastError, LocalDateTime failedAt) {
        if (outboxId == null) {
            return;
        }
        SupervisionAlertReviewRuntimeOutboxDO outboxDO = reviewRuntimeOutboxMapper.selectById(outboxId);
        if (outboxDO == null) {
            return;
        }
        outboxDO.setOutboxStatus("failed")
                .setPublishedAt(failedAt == null ? LocalDateTime.now() : failedAt)
                .setRetryCount((outboxDO.getRetryCount() == null ? 0 : outboxDO.getRetryCount()) + 1)
                .setLastError(trimToLength(lastError, 500));
        reviewRuntimeOutboxMapper.updateById(outboxDO);
    }

    private static String runtimeOutboxAction(String alert, Map<String, Object> metadata) {
        Map<String, Object> alertActions = toStringObjectMap(metadata == null ? null : metadata.get("alertActions"));
        String action = toText(alertActions.get(alert), null);
        return hasText(action) ? action : null;
    }

    private SupervisionAlertReviewItemDO requireItem(Long reviewItemId) {
        SupervisionAlertReviewItemDO itemDO = reviewItemMapper.selectById(reviewItemId);
        if (itemDO == null) {
            throw new IllegalArgumentException("reviewItemId not found: " + reviewItemId);
        }
        return itemDO;
    }

    private ReviewItemAggregate resolveConcurrentReviewStatusMiss(Long reviewItemId, String targetStatus) {
        SupervisionAlertReviewItemDO current = requireItem(reviewItemId);
        if (Objects.equals(targetStatus, current.getReviewStatus())) {
            return toAggregate(current);
        }
        throw new IllegalStateException("review_item_status_conflict: "
                + current.getReviewStatus() + " -> " + targetStatus);
    }

    private static Integer nextVersion(Integer currentVersion) {
        return currentVersion == null ? 1 : currentVersion + 1;
    }

    private void insertEvidence(Long reviewItemId, List<ReviewEvidenceItem> evidenceItems) {
        if (evidenceItems == null || evidenceItems.isEmpty()) {
            return;
        }
        for (ReviewEvidenceItem evidenceItem : evidenceItems) {
            if (reviewEvidenceMapper.selectExisting(
                    reviewItemId,
                    evidenceItem.sourceAlertId(),
                    evidenceItem.materialType(),
                    evidenceItem.materialUri()) == null) {
                reviewEvidenceMapper.insert(toEvidenceDO(reviewItemId, evidenceItem));
            }
        }
    }

    private void insertIngestIdentities(SupervisionAlertReviewItemDO itemDO,
                                        String sourceAlertId,
                                        String sourcePayloadHash,
                                        Map<String, Object> reviewData) {
        Set<String> identityKeys = ingestIdentityLookupKeys(
                itemDO.getSourceSystem(),
                sourceAlertId,
                toStringList(reviewData == null ? null : reviewData.get("ingestIdentityKeys")),
                sourcePayloadHash
        );
        Long tenantId = reviewIdentityTenantId(itemDO.getTenantId());
        for (String identityKey : identityKeys) {
            SupervisionAlertReviewIngestIdentityDO existing =
                    reviewIngestIdentityMapper.selectByIdentity(tenantId, itemDO.getSourceSystem(), identityKey);
            if (existing != null) {
                if (Objects.equals(existing.getReviewItemId(), itemDO.getId())) {
                    continue;
                }
                throw new DuplicateKeyException("duplicate alert review ingest identity: " + identityKey);
            }
            reviewIngestIdentityMapper.insert(new SupervisionAlertReviewIngestIdentityDO()
                    .setTenantId(tenantId)
                    .setReviewItemId(itemDO.getId())
                    .setSourceSystem(itemDO.getSourceSystem())
                    .setIdentityKey(identityKey)
                    .setSourceAlertId(sourceAlertIdFromIdentityKey(itemDO.getSourceSystem(), identityKey, sourceAlertId))
                    .setSourcePayloadHash(sourcePayloadHashFromIdentityKey(itemDO.getSourceSystem(), identityKey, sourcePayloadHash)));
        }
    }

    private void upsertReviewSegment(SupervisionAlertReviewItemDO itemDO) {
        Map<String, Object> reviewData = readJson(itemDO.getReviewData());
        Map<String, Object> segment = toStringObjectMap(reviewData.get("reviewSegment"));
        if (segment.isEmpty()) {
            return;
        }
        SupervisionAlertReviewSegmentDO segmentDO = reviewSegmentMapper.selectByReviewItemId(itemDO.getId());
        boolean insert = segmentDO == null;
        if (insert) {
            segmentDO = new SupervisionAlertReviewSegmentDO()
                    .setTenantId(reviewSegmentTenantId(itemDO.getTenantId()))
                    .setReviewItemId(itemDO.getId())
                    .setVersion(0);
        }
        segmentDO.setTenantId(reviewSegmentTenantId(itemDO.getTenantId()));
        segmentDO.setSegmentNo(toText(segment.get("segmentId"), itemDO.getReviewItemNo()))
                .setCameraId(toText(segment.get("cameraId"), itemDO.getCameraId()))
                .setSeverity(toText(segment.get("severity"), "alert"))
                .setSegmentStatus(toText(segment.get("status"), "active"))
                .setStartTime(toLocalDateTime(segment.get("startTime"), itemDO.getFirstAlertTime()))
                .setEndTime(toLocalDateTime(segment.get("endTime"), itemDO.getLastAlertTime()))
                .setObjectIds(joinCsv(toStringList(segment.get("objectIds"))))
                .setZoneCodes(joinCsv(toStringList(segment.get("zones"))))
                .setSourceAlertIds(joinCsv(toStringList(segment.get("sourceAlertIds"))))
                .setSegmentEvents(writeJsonValue(segment.get("events")))
                .setSegmentMetadata(writeJsonValue(segment));
        assertNoOverlappingReviewSegment(segmentDO);
        if (insert) {
            reviewSegmentMapper.insert(segmentDO);
        } else {
            reviewSegmentMapper.updateById(segmentDO);
        }
    }

    private void assertNoOverlappingReviewSegment(SupervisionAlertReviewSegmentDO segmentDO) {
        if (!hasText(segmentDO.getCameraId())) {
            throw new IllegalArgumentException("review segment cameraId is required: " + segmentDO.getReviewItemId());
        }
        assertReviewSegmentStatusAllowed(segmentDO.getSegmentStatus(), segmentDO.getReviewItemId());
        if (segmentDO.getStartTime() == null) {
            throw new IllegalArgumentException("review segment startTime is required: " + segmentDO.getReviewItemId());
        }
        if (segmentDO.getEndTime() != null && segmentDO.getEndTime().isBefore(segmentDO.getStartTime())) {
            throw new IllegalArgumentException("review segment endTime cannot be before startTime: " + segmentDO.getReviewItemId());
        }
        for (SupervisionAlertReviewSegmentDO overlap : reviewSegmentMapper.selectOverlapping(
                segmentDO.getTenantId(),
                segmentDO.getCameraId(),
                segmentDO.getStartTime(),
                segmentDO.getEndTime())) {
            if (!Objects.equals(overlap.getReviewItemId(), segmentDO.getReviewItemId())) {
                throw new IllegalStateException("overlapping review segment for camera "
                        + segmentDO.getCameraId() + ": " + overlap.getReviewItemId());
            }
        }
    }

    private static void assertReviewSegmentStatusAllowed(String status, Long reviewItemId) {
        if (!List.of("active", "detection", "alert", "ended").contains(status)) {
            throw new IllegalArgumentException("review segment status must be active, detection, alert, or ended: " + reviewItemId);
        }
    }

    private static Long reviewSegmentTenantId(Long tenantId) {
        return tenantId == null ? 0L : tenantId;
    }

    private static Long reviewIdentityTenantId(Long tenantId) {
        return tenantId == null ? 0L : tenantId;
    }

    private static Set<String> ingestIdentityLookupKeys(String sourceSystem,
                                                        String sourceAlertId,
                                                        List<String> identityKeys,
                                                        String sourcePayloadHash) {
        Set<String> keys = new LinkedHashSet<>();
        if (identityKeys != null) {
            for (String identityKey : identityKeys) {
                if (hasText(identityKey)) {
                    keys.add(identityKey);
                }
            }
        }
        if (hasText(sourcePayloadHash)) {
            keys.add(sourceSystem + ":payload:" + sourcePayloadHash);
        }
        if (hasText(sourceAlertId)) {
            keys.add(sourceSystem + ":alert:" + sourceAlertId);
        }
        return keys;
    }

    private static String sourceAlertIdFromIdentityKey(String sourceSystem,
                                                       String identityKey,
                                                       String fallback) {
        String prefix = sourceSystem + ":alert:";
        if (hasText(identityKey) && identityKey.startsWith(prefix)) {
            return identityKey.substring(prefix.length());
        }
        return fallback;
    }

    private static String sourcePayloadHashFromIdentityKey(String sourceSystem,
                                                          String identityKey,
                                                          String fallback) {
        String prefix = sourceSystem + ":payload:";
        if (hasText(identityKey) && identityKey.startsWith(prefix)) {
            return identityKey.substring(prefix.length());
        }
        return fallback;
    }

    private ReviewItemAggregate toAggregate(SupervisionAlertReviewItemDO itemDO) {
        Map<String, Object> reviewData = readJson(itemDO.getReviewData());
        Map<String, Object> eventProjection = toStringObjectMap(reviewData.get("eventProjection"));
        return new ReviewItemAggregate(
                itemDO.getId(),
                itemDO.getReviewItemNo(),
                itemDO.getSourceSystem(),
                itemDO.getRuleCode(),
                itemDO.getSourceAlertType(),
                itemDO.getDeviceId(),
                itemDO.getCameraId(),
                itemDO.getZoneCode(),
                itemDO.getObjectLabel(),
                itemDO.getFirstAlertTime(),
                itemDO.getLastAlertTime(),
                itemDO.getAlertCount(),
                splitSourceAlertIds(itemDO.getSourceAlertIds()),
                reviewData,
                itemDO.getReviewStatus(),
                itemDO.getReviewerUserId(),
                itemDO.getReviewedAt(),
                itemDO.getIgnoreReason(),
                readJson(itemDO.getRuleSuggestion()),
                itemDO.getEventId(),
                itemDO.getConvertedAt(),
                itemDO.getRecordEvidenceStatus(),
                itemDO.getRecordEvidenceCheckedAt(),
                itemDO.getRecordEvidenceMessage(),
                toText(eventProjection.get("eventStatus"), null),
                toText(eventProjection.get("closeCheckStatus"), null),
                toText(eventProjection.get("evidenceStatus"), null),
                toText(eventProjection.get("eventReviewStatus"), null),
                !reviewCaseItemMapper.selectByReviewItemId(itemDO.getId()).isEmpty(),
                itemDO.getRuleSuggestionStatus(),
                itemDO.getRuleSuggestionUpdatedAt()
        );
    }

    private ReviewEvidenceItem toEvidenceItem(SupervisionAlertReviewEvidenceDO evidenceDO) {
        return new ReviewEvidenceItem(
                evidenceDO.getReviewItemId(),
                evidenceDO.getSourceAlertId(),
                evidenceDO.getMaterialType(),
                evidenceDO.getMaterialUri(),
                evidenceDO.getHappenedAt()
        );
    }

    private ReviewUserStatusView toUserStatusView(SupervisionAlertReviewUserStatusDO statusDO) {
        return new ReviewUserStatusView(
                statusDO.getReviewItemId(),
                statusDO.getUserId(),
                statusDO.getHasBeenReviewed(),
                statusDO.getReviewedAt()
        );
    }

    private SupervisionAlertReviewEvidenceDO toEvidenceDO(Long reviewItemId, ReviewEvidenceItem evidenceItem) {
        return new SupervisionAlertReviewEvidenceDO()
                .setReviewItemId(reviewItemId)
                .setSourceAlertId(evidenceItem.sourceAlertId())
                .setMaterialType(evidenceItem.materialType())
                .setMaterialUri(evidenceItem.materialUri())
                .setHappenedAt(evidenceItem.happenedAt());
    }

    private EventProjection toEventProjection(SupervisionEventDO eventDO) {
        return new EventProjection(
                eventDO.getId(),
                eventDO.getEventStatus(),
                eventDO.getCloseCheckStatus(),
                eventDO.getEvidenceStatus()
        );
    }

    private ReviewRuleView toRuleView(SupervisionAlertReviewRuleDO ruleDO) {
        return new ReviewRuleView(
                ruleDO.getId(),
                ruleDO.getRuleCode(),
                ruleDO.getRuleName(),
                ruleDO.getSourceSystem(),
                ruleDO.getCameraId(),
                ruleDO.getZoneCode(),
                ruleDO.getObjectLabel(),
                ruleDO.getMinStaySeconds(),
                ruleDO.getActiveStart(),
                ruleDO.getActiveEnd(),
                ruleDO.getEnabled(),
                ruleDO.getInertiaFrames(),
                ruleDO.getLoiteringSeconds()
        );
    }

    private ReviewSemanticIndexEntry toSemanticIndexEntry(SupervisionAlertReviewSemanticIndexDO indexDO) {
        return new ReviewSemanticIndexEntry(
                indexDO.getReviewItemId(),
                indexDO.getCameraId(),
                indexDO.getFirstAlertTime(),
                indexDO.getLastAlertTime(),
                indexDO.getIndexStatus(),
                indexDO.getDocument(),
                indexDO.getEmbeddingKey(),
                indexDO.getEmbeddingModel(),
                indexDO.getEmbeddingVectorHash(),
                indexDO.getRetryCount(),
                indexDO.getLastError(),
                indexDO.getIndexedAt(),
                indexDO.getVersion()
        );
    }

    private ReviewEvidenceExportJob toExportJob(SupervisionAlertReviewExportJobDO jobDO) {
        ReviewEvidenceExportPackage exportPackage = new ReviewEvidenceExportPackage(
                jobDO.getPackageNo(),
                toText(readJson(jobDO.getManifest()).get("format"), "manifest"),
                jobDO.getReviewCaseId(),
                splitLongCsv(jobDO.getReviewItemIds()),
                splitCsv(jobDO.getEvidenceUris()),
                listCaseTimeline(jobDO.getReviewCaseId()),
                readJson(jobDO.getManifest()),
                jobDO.getGeneratedAt()
        );
        return new ReviewEvidenceExportJob(
                jobDO.getJobNo(),
                jobDO.getStatus(),
                exportPackage,
                jobDO.getFileHash(),
                jobDO.getExpiresAt(),
                jobDO.getOperatorUserId(),
                jobDO.getExportReason(),
                splitLongCsv(jobDO.getBoundEventIds()),
                jobDO.getGeneratedAt()
        );
    }

    private SupervisionAlertReviewCaseDO requireCase(Long reviewCaseId) {
        SupervisionAlertReviewCaseDO caseDO = reviewCaseMapper.selectById(reviewCaseId);
        if (caseDO == null) {
            throw new IllegalArgumentException("reviewCaseId not found: " + reviewCaseId);
        }
        return caseDO;
    }

    private List<SupervisionAlertReviewItemDO> requireItems(List<Long> reviewItemIds) {
        if (reviewItemIds == null || reviewItemIds.isEmpty()) {
            throw new IllegalArgumentException("reviewItemIds must not be empty");
        }
        List<SupervisionAlertReviewItemDO> items = new ArrayList<>(reviewItemIds.size());
        for (Long reviewItemId : reviewItemIds) {
            items.add(requireItem(reviewItemId));
        }
        return items;
    }

    private void insertCaseItems(Long reviewCaseId, List<Long> reviewItemIds) {
        int sortOrder = 1;
        for (Long reviewItemId : reviewItemIds) {
            if (reviewCaseItemMapper.selectExisting(reviewCaseId, reviewItemId) == null) {
                reviewCaseItemMapper.insert(new SupervisionAlertReviewCaseItemDO()
                        .setReviewCaseId(reviewCaseId)
                        .setReviewItemId(reviewItemId)
                        .setSortOrder(sortOrder)
                        .setAddedAt(LocalDateTime.now())
                        .setVersion(0));
            }
            sortOrder++;
        }
    }

    private static void ensureCaseOpen(SupervisionAlertReviewCaseDO caseDO) {
        if (!SupervisionAlertReviewService.REVIEW_CASE_OPEN.equals(caseDO.getStatus())) {
            throw new IllegalStateException("review case is not open: " + caseDO.getId() + " status=" + caseDO.getStatus());
        }
    }

    private static String caseRelatedAuditNote(String relatedKey,
                                               Long relatedCaseId,
                                               Iterable<Long> reviewItemIds,
                                               String notes) {
        List<String> values = new ArrayList<>();
        values.add(relatedKey + "=" + relatedCaseId);
        if (reviewItemIds != null) {
            values.add("reviewItemIds=" + joinLongCsv(reviewItemIds));
        }
        if (hasText(notes)) {
            values.add("notes=" + notes);
        }
        return String.join("; ", values);
    }

    private static String caseOwnerAuditNote(Long ownerUserId, String notes) {
        List<String> values = new ArrayList<>();
        values.add("ownerUserId=" + ownerUserId);
        if (hasText(notes)) {
            values.add("notes=" + notes);
        }
        return String.join("; ", values);
    }

    private static String caseNotesAuditNote(String notes) {
        return hasText(notes) ? "notes=" + notes : null;
    }

    private void insertCaseAudit(Long reviewCaseId,
                                 Long reviewItemId,
                                 String actionType,
                                 String actionNote,
                                 Long operatorUserId) {
        insertCaseAudit(reviewCaseId, reviewItemId, actionType, actionNote, operatorUserId, LocalDateTime.now(), null);
    }

    private void insertCaseAudit(Long reviewCaseId,
                                 Long reviewItemId,
                                 String actionType,
                                 String actionNote,
                                 Long operatorUserId,
                                 LocalDateTime happenedAt,
                                 Map<String, Object> metadata) {
        reviewCaseAuditMapper.insert(new SupervisionAlertReviewCaseAuditDO()
                .setReviewCaseId(reviewCaseId)
                .setReviewItemId(reviewItemId)
                .setActionType(actionType)
                .setActionNote(actionNote)
                .setMetadata(writeJson(metadata))
                .setOperatorUserId(operatorUserId)
                .setHappenedAt(happenedAt == null ? LocalDateTime.now() : happenedAt)
                .setVersion(0));
    }

    private void fillCaseSummary(SupervisionAlertReviewCaseDO caseDO, List<SupervisionAlertReviewItemDO> items) {
        List<String> cameraIds = items.stream()
                .map(SupervisionAlertReviewItemDO::getCameraId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        LocalDateTime startTime = items.stream()
                .map(SupervisionAlertReviewItemDO::getFirstAlertTime)
                .reduce(null, SupervisionAlertReviewMapperStore::min);
        LocalDateTime endTime = items.stream()
                .map(SupervisionAlertReviewItemDO::getLastAlertTime)
                .reduce(null, SupervisionAlertReviewMapperStore::max);
        caseDO.setCameraIds(joinCsv(cameraIds))
                .setStartTime(startTime)
                .setEndTime(endTime);
    }

    private ReviewCaseView toCaseView(SupervisionAlertReviewCaseDO caseDO) {
        List<Long> reviewItemIds = reviewCaseItemMapper.selectByCaseId(caseDO.getId()).stream()
                .map(SupervisionAlertReviewCaseItemDO::getReviewItemId)
                .toList();
        return new ReviewCaseView(
                caseDO.getId(),
                caseDO.getCaseNo(),
                caseDO.getTitle(),
                caseDO.getStatus(),
                caseDO.getPrimaryReviewItemId(),
                reviewItemIds,
                splitCsv(caseDO.getCameraIds()),
                caseDO.getStartTime(),
                caseDO.getEndTime(),
                caseDO.getOwnerUserId(),
                caseDO.getNotes()
        );
    }

    private static String newReviewItemNo() {
        return REVIEW_ITEM_NO_PREFIX + UUID.randomUUID();
    }

    private static String newReviewCaseNo() {
        return REVIEW_CASE_NO_PREFIX + UUID.randomUUID();
    }

    private static String joinLongCsv(List<Long> values) {
        if (values == null || values.isEmpty()) {
            return "";
        }
        return joinCsv(values.stream().map(String::valueOf).toList());
    }

    private static String joinLongCsv(Iterable<Long> values) {
        if (values == null) {
            return "";
        }
        List<String> normalized = new ArrayList<>();
        for (Long value : values) {
            if (value != null) {
                normalized.add(String.valueOf(value));
            }
        }
        return joinCsv(normalized);
    }

    private static String exportAuditNote(String jobNo, String fileHash, String reason) {
        List<String> values = new ArrayList<>();
        values.add("jobNo=" + jobNo);
        values.add("fileHash=" + fileHash);
        if (hasText(reason)) {
            values.add("reason=" + reason);
        }
        return String.join("; ", values);
    }

    private static String exportDownloadAuditNote(String jobNo, String fileHash, Long operatorUserId, String reason) {
        List<String> values = new ArrayList<>();
        values.add("jobNo=" + jobNo);
        values.add("fileHash=" + fileHash);
        if (operatorUserId != null) {
            values.add("operatorUserId=" + operatorUserId);
        }
        if (hasText(reason)) {
            values.add("reason=" + reason);
        }
        return String.join("; ", values);
    }

    private static String writeJson(Map<String, Object> value) {
        if (value == null || value.isEmpty()) {
            return null;
        }
        try {
            return OBJECT_MAPPER.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            throw new IllegalArgumentException("review json is invalid", ex);
        }
    }

    private static String writeJsonValue(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Map<?, ?> map && map.isEmpty()) {
            return null;
        }
        if (value instanceof List<?> list && list.isEmpty()) {
            return null;
        }
        try {
            return OBJECT_MAPPER.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            throw new IllegalArgumentException("review json is invalid", ex);
        }
    }

    private static Map<String, Object> readJson(String value) {
        if (value == null || value.isBlank()) {
            return Map.of();
        }
        try {
            return OBJECT_MAPPER.readValue(value, MAP_TYPE);
        } catch (JsonProcessingException ex) {
            return Map.of();
        }
    }

    private static String joinSourceAlertIds(List<String> sourceAlertIds) {
        return String.join(SOURCE_ALERT_ID_SEPARATOR, sourceAlertIds);
    }

    private static String joinCsv(List<String> values) {
        return String.join(CSV_SEPARATOR, values == null ? List.of() : values);
    }

    private static List<String> splitCsv(String values) {
        if (values == null || values.isBlank()) {
            return List.of();
        }
        Set<String> result = new LinkedHashSet<>(Arrays.asList(values.split(CSV_SEPARATOR)));
        result.removeIf(String::isBlank);
        return List.copyOf(result);
    }

    private static Map<String, Object> toStringObjectMap(Object value) {
        if (!(value instanceof Map<?, ?> raw) || raw.isEmpty()) {
            return Map.of();
        }
        Map<String, Object> result = new LinkedHashMap<>();
        for (Map.Entry<?, ?> entry : raw.entrySet()) {
            if (entry.getKey() != null && entry.getValue() != null) {
                result.put(String.valueOf(entry.getKey()), entry.getValue());
            }
        }
        return Map.copyOf(result);
    }

    private static List<String> toStringList(Object value) {
        if (value instanceof List<?> list) {
            List<String> result = new ArrayList<>();
            for (Object item : list) {
                if (item != null && !String.valueOf(item).isBlank()) {
                    result.add(String.valueOf(item));
                }
            }
            return List.copyOf(result);
        }
        if (value instanceof String text && !text.isBlank()) {
            return List.of(text);
        }
        return List.of();
    }

    private static List<Long> splitLongCsv(String values) {
        List<Long> result = new ArrayList<>();
        for (String value : splitCsv(values)) {
            try {
                result.add(Long.parseLong(value));
            } catch (NumberFormatException ignored) {
                // Ignore malformed historical values while preserving the rest of the audit trail.
            }
        }
        return List.copyOf(result);
    }

    private static List<String> splitSourceAlertIds(String sourceAlertIds) {
        if (sourceAlertIds == null || sourceAlertIds.isBlank()) {
            return List.of();
        }
        Set<String> result = new LinkedHashSet<>(Arrays.asList(sourceAlertIds.split(SOURCE_ALERT_ID_SEPARATOR)));
        result.removeIf(String::isBlank);
        return List.copyOf(result);
    }

    private static String toText(Object value, String fallback) {
        if (value == null || String.valueOf(value).isBlank()) {
            return fallback;
        }
        return String.valueOf(value);
    }

    private static LocalDateTime toLocalDateTime(Object value, LocalDateTime fallback) {
        if (value instanceof LocalDateTime time) {
            return time;
        }
        if (value == null || String.valueOf(value).isBlank()) {
            return fallback;
        }
        try {
            return LocalDateTime.parse(String.valueOf(value));
        } catch (RuntimeException ignored) {
            return fallback;
        }
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private static String trimToLength(String value, int maxLength) {
        if (value == null || maxLength <= 0) {
            return value;
        }
        return value.length() <= maxLength ? value : value.substring(0, maxLength);
    }

    private static LocalDateTime min(LocalDateTime first, LocalDateTime second) {
        if (first == null) {
            return second;
        }
        if (second == null) {
            return first;
        }
        return first.isBefore(second) ? first : second;
    }

    private static LocalDateTime max(LocalDateTime first, LocalDateTime second) {
        if (first == null) {
            return second;
        }
        if (second == null) {
            return first;
        }
        return first.isAfter(second) ? first : second;
    }

}
