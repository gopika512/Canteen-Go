# 🍽️ Smart Campus Canteen

![Smart Canteen Logo](https://raw.githubusercontent.com/gopika512/Canteen-Go/main/frontend/src/assets/logo.png)

A modern, full-stack College Canteen Web Application designed to streamline food ordering, reduce physical queues, and digitize the entire canteen workflow. Built with **React** on the frontend, **FastAPI** on the backend, and **MongoDB** for the database, this platform features real-time WebSocket order tracking and an integrated QR-code pickup system.

---

## ✨ Key Features

### 🎓 For Students
* **Live Digital Menu:** Browse available food items across various categories (Breakfast, Lunch, Snacks, Beverages) with high-quality images.
* **Shopping Cart & Checkout:** Add items to cart and check out securely.
* **Real-time Order Tracking:** Watch your order status change live (`Pending` → `Preparing` → `Ready`) without refreshing the page, powered by WebSockets.
* **Secure QR Pickup:** Receive a unique, single-use QR code when your food is ready. Scan it at the counter to securely claim your order.
* **Order History:** View past orders and payment statuses.

### 👨‍🍳 For Canteen Admins
* **Live Order Dashboard:** Instantly receive new orders on the dashboard in real-time. Change order statuses with a single click.
* **Integrated Mobile QR Scanner:** Use your phone or laptop camera to scan a student's Pickup QR code. The system verifies it instantly, prevents duplicate uses, and marks the order as "Completed".
* **Menu Management:** Add new dishes, update prices, or temporarily disable out-of-stock items so students can't order them.
* **Live Analytics:** Track total daily orders, gross revenue, and average order values at a glance.

---

## 🛠️ Technology Stack

**Frontend**
* React.js (Vite)
* Tailwind CSS (Styling)
* React Router DOM (Navigation)
* HTML5-QRCode (Admin Camera Scanner)
* qrcode.react (Student QR Generator)

**Backend**
* Python 3.11
* FastAPI (High-performance API framework)
* WebSockets (Real-time live updates)
* Motor (Async MongoDB Driver)
* Passlib / bcrypt (Authentication)
* JWT (Secure stateless sessions)

**Database & Deployment**
* MongoDB Atlas (Cloud Database)
* Render (Backend Hosting)
* Vercel (Frontend Hosting)

---

## 🚀 Getting Started

### Prerequisites
* **Node.js** (v16+)
* **Python** (v3.10+)
* **MongoDB** (Local or Atlas Cluster)

### 1. Backend Setup
1. Open a terminal and navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv .venv
   .venv\Scripts\activate      # Windows
   # source .venv/bin/activate # Mac/Linux
   ```
3. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` file in the `backend` directory and configure your variables:
   ```env
   MONGO_URL=mongodb+srv://<username>:<password>@cluster0.mongodb.net/canteen?retryWrites=true&w=majority
   JWT_SECRET=your_super_secret_jwt_key
   ```
5. Start the FastAPI backend server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   *The backend will automatically seed 50 default menu items and an admin account (`admin@canteen.com` / `admin123`) if the database is empty.*

### 2. Frontend Setup
1. Open a new terminal and navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📸 Usage & Workflows

1. **Login as Admin:** Navigate to the login page and use `admin@canteen.com` / `admin123`. Go to the Admin Dashboard to see the live orders list and manage the menu.
2. **Place an Order:** Create a new student account, add some items to your cart, and check out.
3. **Watch it Live:** As a student, your screen will show the order as "Pending". In the Admin panel, the order will pop up instantly. When the admin clicks "Preparing" or "Ready", the student's screen updates instantly!
4. **Pickup:** Once the order is "Ready", a QR code appears on the student's screen. The Admin clicks the "📷 Camera" button on the dashboard, scans the student's phone, and the order is completed securely.

---

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the issues page or submit a Pull Request.

## 📝 License
This project is open-source and available under the [MIT License](LICENSE).
