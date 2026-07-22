import { Router } from 'vue-router';
import { PageEnum } from '@/enums/pageEnum'
import { StorageEnum } from '@/enums/storageEnum'
import { setLocalStorage } from '@/utils'
import { defaultTenantId } from '@/settings/httpSetting'

/** 从 URL query 接收 WEB 传入的 Token（跨域新开编辑器） */
function ingestTokenFromQuery(query: Record<string, any>) {
  const accessToken = query?.accessToken
  if (!accessToken || typeof accessToken !== 'string') return false
  setLocalStorage(StorageEnum.GO_ACCESS_TOKEN_STORE, {
    accessToken,
    refreshToken: typeof query.refreshToken === 'string' ? query.refreshToken : '',
    tenantId: typeof query.tenantId === 'string' ? query.tenantId : defaultTenantId,
  })
  return true
}

function stripAuthQuery(query: Record<string, any>) {
  const next = { ...query }
  delete next.accessToken
  delete next.refreshToken
  delete next.tenantId
  return next
}

export function createRouterGuards(router: Router) {
  // 前置
  router.beforeEach(async (to, from, next) => {
    // http://localhost:3000/#/chart/preview/792622755697790976?t=123
    // 把外部动态参数放入window.route.params，后续API动态接口可以用window.route?.params?.t来拼接参数
    // @ts-ignore
    if (!window.route) window.route = {params: {}}
    // @ts-ignore
    Object.assign(window.route.params, to.query)

    const Loading = window['$loading'];
    Loading && Loading.start();

    // WEB 新标签页打开时携带 Token
    if (ingestTokenFromQuery(to.query as any)) {
      const cleaned = stripAuthQuery(to.query as any)
      next({ path: to.path, query: cleaned, replace: true })
      return
    }

    const isErrorPage = router.getRoutes().findIndex((item) => item.name === to.name);
    if (isErrorPage === -1) {
      next({ name: PageEnum.ERROR_PAGE_NAME_404 })
      return
    }

    next()
  })

  router.afterEach((to, _, failure) => {
    const Loading = window['$loading'];
    document.title = (to?.meta?.title as string) || document.title;
    Loading && Loading.finish();
  })

  // 错误
  router.onError((error) => {
    console.log(error, '路由错误');
  });
}
