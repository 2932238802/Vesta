import { createRouter, createWebHistory } from 'vue-router'
import { getToken } from './api'
import Root from './views/Root.vue'
import Invite from './views/Invite.vue'
import Quiz from './views/Quiz.vue'
import ReportView from './views/ReportView.vue'
import NotFound from './views/NotFound.vue'
import Login from './views/admin/Login.vue'
import AdminLayout from './views/admin/AdminLayout.vue'
import Dashboard from './views/admin/Dashboard.vue'
import Invites from './views/admin/Invites.vue'
import Submissions from './views/admin/Submissions.vue'
import SubmissionDetail from './views/admin/SubmissionDetail.vue'
import SurveyEditor from './views/admin/SurveyEditor.vue'
import ReportEditor from './views/admin/ReportEditor.vue'
import ReportPreview from './views/admin/ReportPreview.vue'
import SkillEditor from './views/admin/SkillEditor.vue'

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
        { path: 'submissions/:id', name: 'admin-submission', component: SubmissionDetail },
        { path: 'survey', name: 'admin-survey', component: SurveyEditor },
        { path: 'report', name: 'admin-report', component: ReportEditor },
        { path: 'skill', name: 'admin-skill', component: SkillEditor }
      ]
    },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFound }
  ]
})

router.beforeEach((to) => {
  if (to.meta.admin && !getToken()) {
    return { name: 'admin-login', query: { next: to.fullPath } }
  }
  return true
})
