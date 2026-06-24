import type { DefineComponent } from 'vue'

// Wot UI's bundled global declarations import component Vue source files, which
// makes vue-tsc type-check the library internals. Keep global component names
// without pulling third-party .vue files into the app type-check.
type WotComponent = DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>

declare module 'vue' {
  export interface GlobalComponents {
    WdActionSheet: WotComponent
    WdAvatar: WotComponent
    WdAvatarGroup: WotComponent
    WdBacktop: WotComponent
    WdBadge: WotComponent
    WdButton: WotComponent
    WdCalendar: WotComponent
    WdCalendarView: WotComponent
    WdCard: WotComponent
    WdCascader: WotComponent
    WdCell: WotComponent
    WdCellGroup: WotComponent
    WdCheckbox: WotComponent
    WdCheckboxGroup: WotComponent
    WdCircle: WotComponent
    WdCol: WotComponent
    WdCollapse: WotComponent
    WdCollapseItem: WotComponent
    WdConfigProvider: WotComponent
    WdCountDown: WotComponent
    WdCountTo: WotComponent
    WdCurtain: WotComponent
    WdDatetimePicker: WotComponent
    WdDatetimePickerView: WotComponent
    WdDialog: WotComponent
    WdDivider: WotComponent
    WdDropMenu: WotComponent
    WdDropMenuItem: WotComponent
    WdEmpty: WotComponent
    WdFab: WotComponent
    WdFloatingPanel: WotComponent
    WdForm: WotComponent
    WdFormItem: WotComponent
    WdGap: WotComponent
    WdGrid: WotComponent
    WdGridItem: WotComponent
    WdIcon: WotComponent
    WdImagePreview: WotComponent
    WdImg: WotComponent
    WdImgCropper: WotComponent
    WdIndexAnchor: WotComponent
    WdIndexBar: WotComponent
    WdInput: WotComponent
    WdInputNumber: WotComponent
    WdKeyboard: WotComponent
    WdLoadmore: WotComponent
    WdLoading: WotComponent
    WdNavbar: WotComponent
    WdNavbarCapsule: WotComponent
    WdNoticeBar: WotComponent
    WdNotify: WotComponent
    WdOverlay: WotComponent
    WdPagination: WotComponent
    WdPasswordInput: WotComponent
    WdPicker: WotComponent
    WdPickerView: WotComponent
    WdPopover: WotComponent
    WdPopup: WotComponent
    WdProgress: WotComponent
    WdRadio: WotComponent
    WdRadioGroup: WotComponent
    WdRate: WotComponent
    WdResize: WotComponent
    WdRootPortal: WotComponent
    WdRow: WotComponent
    WdSearch: WotComponent
    WdSegmented: WotComponent
    WdSelectPicker: WotComponent
    WdSignature: WotComponent
    WdSkeleton: WotComponent
    WdSlideVerify: WotComponent
    WdSlider: WotComponent
    WdSortButton: WotComponent
    WdStep: WotComponent
    WdSteps: WotComponent
    WdSticky: WotComponent
    WdStickyBox: WotComponent
    WdSwipeAction: WotComponent
    WdSwiper: WotComponent
    WdSwiperNav: WotComponent
    WdSwitch: WotComponent
    WdTab: WotComponent
    WdTabbar: WotComponent
    WdTabbarItem: WotComponent
    WdTable: WotComponent
    WdTableColumn: WotComponent
    WdTabs: WotComponent
    WdTag: WotComponent
    WdText: WotComponent
    WdTextarea: WotComponent
    WdToast: WotComponent
    WdTooltip: WotComponent
    WdTour: WotComponent
    WdTransition: WotComponent
    WdUpload: WotComponent
    WdVideoPreview: WotComponent
    WdWatermark: WotComponent
  }
}

export {}
