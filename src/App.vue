<template>
  <div class="task-board">
    <div v-for="column in columns" :key="column.title" class="column">
      <h2 class="text-xl font-bold mb-4">{{ column.title }}</h2>
      <table class="w-full border border-gray-300 mb-4">
        <thead>
        <tr>
          <th class="py-2 px-4 border-b border-gray-300">Task</th>
          <th class="py-2 px-4 border-b border-gray-300">Date</th>
          <th class="py-2 px-4 border-b border-gray-300">Type</th>
          <th class="py-2 px-4 border-b border-gray-300"></th>
        </tr>
        </thead>
        <tbody>
        <tr v-for="task in column.tasks" :key="task.id">
          <td class="py-2 px-4 border-b border-gray-300">{{ task.title }}</td>
          <td class="py-2 px-4 border-b border-gray-300">{{ task.date }}</td>
          <td class="py-2 px-4 border-b border-gray-300">{{ task.type }}</td>
          <td class="py-2 px-4 border-b border-gray-300">
            <button @click="editTask(column, task)" class="mr-2 text-blue-500">Edit</button>
            <button @click="deleteTask(column, task)" class="text-red-500">Delete</button>
          </td>
        </tr>
        </tbody>
      </table>
      <button @click="addTask(column)" class="py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600">Add Task</button>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      columns: [
        {
          title: "Backlog",
          tasks: [
            {
              id: 1,
              title: "Add discount code to checkout page",
              date: "Sep 14",
              type: "Feature Request"
            },
            {
              id: 2,
              title: "Provide documentation on integrations",
              date: "Sep 12"
            },
            {
              id: 3,
              title: "Design shopping cart dropdown",
              date: "Sep 9",
              type: "Design"
            },
            {
              id: 4,
              title: "Add discount code to checkout page",
              date: "Sep 14",
              type: "Feature Request"
            },
            {
              id: 5,
              title: "Test checkout flow",
              date: "Sep 15",
              type: "QA"
            }
          ]
        },
        {
          title: "In Progress",
          tasks: [
            {
              id: 6,
              title: "Design shopping cart dropdown",
              date: "Sep 9",
              type: "Design"
            },
            {
              id: 7,
              title: "Add discount code to checkout page",
              date: "Sep 14",
              type: "Feature Request"
            },
            {
              id: 8,
              title: "Provide documentation on integrations",
              date: "Sep 12",
              type: "Backend"
            }
          ]
        },
        {
          title: "Review",
          tasks: [
            {
              id: 9,
              title: "Provide documentation on integrations",
              date: "Sep 12"
            },
            {
              id: 10,
              title: "Design shopping cart dropdown",
              date: "Sep 9",
              type: "Design"
            },
            {
              id: 11,
              title: "Add discount code to checkout page",
              date: "Sep 14",
              type: "Feature Request"
            },
            {
              id: 12,
              title: "Design shopping cart dropdown",
              date: "Sep 9",
              type: "Design"
            },
            {
              id: 13,
              title: "Add discount code to checkout page",
              date: "Sep 14",
              type: "Feature Request"
            }
          ]
        },
        {
          title: "Done",
          tasks: [
            {
              id: 14,
              title: "Add discount code to checkout page",
              date: "Sep 14",
              type: "Feature Request"
            },
            {
              id: 15,
              title: "Design shopping cart dropdown",
              date: "Sep 9",
              type: "Design"
            },
            {
              id: 16,
              title: "Add discount code to checkout page",
              date: "Sep 14",
              type: "Feature Request"
            }
          ]
        }
      ]
    };
  },
  methods: {
    addTask(column) {
      const newTask = {
        id: Date.now(), // Generate a unique ID for the new task
        title: "New Task",
        date: "",
        type: ""
      };
      this.$swal.fire({
        title: 'Creer Un',
        input: 'text',
        inputAttributes: {
          autocapitalize: 'off'
        },
        showCancelButton: true,
        confirmButtonText: 'Save Task',
        showLoaderOnConfirm: true,
      }).then((result) => {
        if (result) {
          newTask.title = result.value;
          column.tasks.push(newTask);
        }
      })
      // const newTitle = prompt("Enter the new task title:", newTask.title);
      if (newTitle) {
        newTask.title = newTitle;
      column.tasks.push(newTask);
      }
    },
    editTask(column, task) {
      // Implement the logic to edit a task
      const newTitle = prompt("Enter the new task title:", task.title);
      if (newTitle) {
        task.title = newTitle;
      }
    },
    deleteTask(column, task) {
      // Implement the logic to delete a task
      this.$swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, delete it!'
      }).then((result) => {
        if (result.isConfirmed) {
          const index = column.tasks.indexOf(task);
          if (index !== -1) {
            column.tasks.splice(index, 1);
          }
          this.$swal.fire(
              'Deleted!',
              'Your file has been deleted.',
              'success'
          )
        }
      })

    }
  }
};
</script>

<style>
/* Add styles for the task-board component */
</style>
