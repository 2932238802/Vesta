import { createRouter, createWebHistory } from 'vue-router'
import { api, getToken, setToken } from './api'
import Root from './views/Root.vue'
import NotFound from './views/NotFound.vue'

// 路由级拆包：入口页和 404 同步加载，其余页面按路由懒加载。
// 公开页（邀请 / 问卷 / 报告）不再把整个管理后台打进首屏 chunk。
const Invite = () => import('./views/Invite.vue')
const Quiz = () => import('./views/Quiz.vue')
const ReportView = () => import('./views/ReportView.vue')
const Login = () => import('./views/admin/Login.vue')
const AdminLayout = () => import('./views/admin/AdminLayout.vue')
const Dashboard = () => import('./views/admin/Dashboard.vue')
const Invites = () => import('./views/admin/Invites.vue')
const Submissions = () => import('./views/admin/Submissions.vue')
const SubmissionDetail = () => import('./views/admin/SubmissionDetail.vue')
const SurveyEditor = () => import('./views/admin/SurveyEditor.vue')
const ReportEditor = () => import('./views/admin/ReportEditor.vue')
const ReportPreview = () => import('./views/admin/ReportPreview.vue')
const SkillEditor = () => import('./views/admin/SkillEditor.vue')
const ConsultWorkspace = () => import('./views/admin/ConsultWorkspace.vue')
const ConsultPurposes = () => import('./views/admin/ConsultPurposes.vue')
const ConsultCollections = () => import('./views/admin/ConsultCollections.vue')
const ConsultCollectionDetail = () => import('./views/admin/ConsultCollectionDetail.vue')
const ResumeCollection = () => import('./views/admin/ResumeCollection.vue')

export const router = createRouter({
  history: createWebHistory(),
  scrollBehavior(to, from, saved) {
    if (saved) return saved
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { top: 0 }
  },
  routes: [
    { path: '/', name: 'root', component: Root },
    { path: '/i/:token', name: 'invite', component: Invite },
    { path: '/i/:token/quiz', name: 'quiz', component: Quiz },
    { path: '/r/:slug', name: 'report', component: ReportView },
    { path: '/admin/login', name: 'admin-login', component: Login },
    {
      path: '/admin/report/preview',
      name: 'admin-report-preview',
      component: ReportPreview,
      meta: { admin: true }
    },
    {
      path: '/admin',
      component: AdminLayout,
      meta: { admin: true },
      children: [
        { path: '', name: 'admin-dashboard', component: Dashboard },
        { path: 'invites', name: 'admin-invites', component: Invites },
        { path: 'submissions', name: 'admin-submissions', component: Submissions },
        { path: 'appointments', redirect: { name: 'admin-submissions' } },
        { path: 'submissions/:id', name: 'admin-submission', component: SubmissionDetail },
        { path: 'survey', name: 'admin-survey', component: SurveyEditor, meta: { settings: true } },
        { path: 'report', name: 'admin-report', component: ReportEditor, meta: { settings: true } },
        { path: 'skill', name: 'admin-skill', component: SkillEditor, meta: { settings: true } },
        { path: 'consult', name: 'admin-consult', component: ConsultWorkspace },
        { path: 'consult/tree', redirect: { name: 'admin-consult-purposes' } },
        { path: 'consult/purposes', name: 'admin-consult-purposes', component: ConsultPurposes },
        { path: 'consult/collections', name: 'admin-consult-collections', component: ConsultCollections },
        {
          path: 'consult/collections/:id',
          name: 'admin-consult-collection',
          component: ConsultCollectionDetail
        },
        { path: 'resumes', name: 'admin-resumes', component: ResumeCollection }
      ]
    },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFound }
  ]
})

const PAGE_TITLES: Record<string, string> = {
  root: '大学现状自评',
  invite: '填写现状自评',
  quiz: '正在填写 · 大学现状自评',
  report: '你的报告 · 大学现状自评',
  'admin-login': '登录 · 管理后台',
  'admin-dashboard': '概览 · 管理后台',
  'admin-invites': '邀请链接 · 管理后台',
  'admin-submissions': '学员名单 · 管理后台',
  'admin-submission': '答卷详情 · 管理后台',
  'admin-survey': '问卷设置 · 管理后台',
  'admin-report': '报告设置 · 管理后台',
  'admin-report-preview': '报告预览 · 管理后台',
  'admin-skill': 'AI 分析规则 · 管理后台',
  'admin-consult': '写咨询稿 · 管理后台',
  'admin-consult-purposes': '咨询树 · 管理后台',
  'admin-consult-collections': '收藏栏 · 管理后台',
  'admin-consult-collection': '收藏详情 · 管理后台',
  'admin-resumes': '简历收集 · 管理后台',
  'not-found': '页面不存在'
}

router.afterEach((to) => {
  document.title =
    (typeof to.name === 'string' ? PAGE_TITLES[to.name] : undefined) ?? '大学现状自评'
})

router.beforeEach(async (to) => {
  if (to.meta.admin && !getToken()) {
    try {
      const result = await api.devLogin()
      setToken(result.token)
      return true
    } catch {
      // 生产环境不提供免密登录，继续走正常登录页。
    }
    return { name: 'admin-login', query: { next: to.fullPath } }
  }
  return true
})
