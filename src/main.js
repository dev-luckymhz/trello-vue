import { createApp } from 'vue'
import './style.css'
import VueSweetalert2 from 'vue-sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

import App from './App.vue'
/* import the fontawesome core */
import { library } from '@fortawesome/fontawesome-svg-core'

/* import font awesome icon component */
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

/* import specific icons */
import { faTrash, faPencil, faPlus, faEllipsisV } from '@fortawesome/free-solid-svg-icons'

/* add icons to the library */
library.add(faTrash, faPencil, faPlus, faEllipsisV)

const app = createApp(App).component('font-awesome-icon', FontAwesomeIcon)

app.use(VueSweetalert2);

app.mount('#app');
