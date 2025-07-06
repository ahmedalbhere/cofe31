document.addEventListener('DOMContentLoaded', function() {
    // تهيئة المتغيرات
    let currentUser = null;
    let editingItemId = null;
    
    // عناصر DOM
    const ordersList = document.getElementById('orders-list');
    const hotItemsList = document.getElementById('hot-items-list');
    const coldItemsList = document.getElementById('cold-items-list');
    const orderFilter = document.getElementById('order-filter');
    const addItemForm = document.getElementById('add-item');
    const editModal = document.getElementById('edit-modal');
    const closeModal = document.querySelector('.close-modal');
    const saveEditBtn = document.getElementById('save-edit');
    const logoutBtn = document.getElementById('logout-btn');
    
    // تسجيل الدخول
    function login() {
        firebase.auth().signInWithEmailAndPassword('admin@easyqafiya.com', 'admin123')
            .then((userCredential) => {
                currentUser = userCredential.user;
                document.getElementById('admin-name').textContent = `مرحباً، ${currentUser.email}`;
                loadData();
            })
            .catch((error) => {
                console.error('Login error:', error);
                alert('حدث خطأ أثناء تسجيل الدخول');
            });
    }
    
    // تسجيل الخروج
    function logout() {
        firebase.auth().signOut()
            .then(() => {
                currentUser = null;
                window.location.href = '../client/index.html';
            })
            .catch((error) => {
                console.error('Logout error:', error);
            });
    }
    
    // تحميل البيانات
    function loadData() {
        loadOrders();
        loadMenu();
        loadStats();
    }
    
    // تحميل الطلبات
    function loadOrders() {
        const filterValue = orderFilter.value;
        let ordersRef = database.ref('orders').orderByChild('timestamp');
        
        if (filterValue !== 'all') {
            ordersRef = ordersRef.orderByChild('status').equalTo(filterValue);
        }
        
        ordersRef.on('value', (snapshot) => {
            ordersList.innerHTML = '';
            const orders = snapshot.val();
            
            if (!orders) {
                ordersList.innerHTML = '<p class="no-orders">لا توجد طلبات</p>';
                return;
            }
            
            Object.keys(orders).reverse().forEach(key => {
                const order = orders[key];
                displayOrder(key, order);
            });
        });
    }
    
    // عرض الطلب
    function displayOrder(orderId, order) {
        const orderElement = document.createElement('div');
        orderElement.className = `order-card ${order.status}`;
        orderElement.dataset.id = orderId;
        
        const orderTime = new Date(order.timestamp).toLocaleTimeString();
        
        let itemsHtml = '';
        order.items.forEach(item => {
            itemsHtml += `
                <div class="order-item">
                    <span>${item.quantity}x ${item.name}</span>
                    <span>${item.price * item.quantity} ج.م</span>
                </div>
            `;
        });
        
        let actionsHtml = '';
        if (order.status === 'new') {
            actionsHtml = `
                <button class="action-btn prepare-btn">بدء التحضير</button>
                <button class="action-btn cancel-btn">إلغاء الطلب</button>
            `;
        } else if (order.status === 'preparing') {
            actionsHtml = `
                <button class="action-btn complete-btn">تم الإكمال</button>
                <button class="action-btn cancel-btn">إلغاء الطلب</button>
            `;
        }
        
        orderElement.innerHTML = `
            <div class="order-header">
                <div>
                    <span class="order-id">#${orderId.substring(0, 5)}</span>
                    <span class="order-table">طاولة ${order.table}</span>
                </div>
                <span class="order-time">${orderTime}</span>
            </div>
            <div class="order-items">
                ${itemsHtml}
            </div>
            <div class="order-notes">
                <strong>ملاحظات:</strong> ${order.notes || 'لا توجد ملاحظات'}
            </div>
            <div class="order-total">
                <strong>الإجمالي:</strong> ${order.total} ج.م
            </div>
            <div class="order-actions">
                ${actionsHtml}
            </div>
        `;
        
        ordersList.appendChild(orderElement);
        
        // إضافة الأحداث للأزرار
        const prepareBtn = orderElement.querySelector('.prepare-btn');
        const completeBtn = orderElement.querySelector('.complete-btn');
        const cancelBtn = orderElement.querySelector('.cancel-btn');
        
        if (prepareBtn) {
            prepareBtn.addEventListener('click', () => updateOrderStatus(orderId, 'preparing'));
        }
        if (completeBtn) {
            completeBtn.addEventListener('click', () => updateOrderStatus(orderId, 'completed'));
        }
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => updateOrderStatus(orderId, 'cancelled'));
        }
    }
    
    // تحديث حالة الطلب
    function updateOrderStatus(orderId, status) {
        database.ref(`orders/${orderId}/status`).set(status)
            .catch(error => {
                console.error('Error updating order:', error);
                alert('حدث خطأ أثناء تحديث حالة الطلب');
            });
    }
    
    // تحميل القائمة
    function loadMenu() {
        database.ref('menu').on('value', (snapshot) => {
            hotItemsList.innerHTML = '';
            coldItemsList.innerHTML = '';
            
            const menuItems = snapshot.val();
            if (!menuItems) return;
            
            Object.keys(menuItems).forEach(key => {
                const item = menuItems[key];
                displayMenuItem(key, item);
            });
        });
    }
    
    // عرض عنصر القائمة
    function displayMenuItem(itemId, item) {
        const itemElement = document.createElement('div');
        itemElement.className = 'menu-item-card';
        itemElement.dataset.id = item
