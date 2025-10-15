#!/usr/bin/env python3
"""
Comprehensive Backend API Tests for Espaço Braite
Multi-tenant lava-rápido system with PostgreSQL, JWT auth, and RBAC
"""

import requests
import json
import os
from datetime import datetime

# Configuration
BASE_URL = "https://braite-manager.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

# Test credentials
TEST_USERNAME = "admin1"
TEST_PASSWORD = "123"

# Global variables for test state
access_token = None
refresh_token = None
tenant_id = None
user_data = None
created_client_id = None
created_service_id = None
created_order_id = None

def log_test(test_name, status, details=""):
    """Log test results with timestamp"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    status_symbol = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⚠️"
    print(f"[{timestamp}] {status_symbol} {test_name}")
    if details:
        print(f"    {details}")

def make_request(method, endpoint, data=None, headers=None, params=None):
    """Make HTTP request with error handling"""
    url = f"{API_BASE}{endpoint}"
    
    try:
        if method.upper() == "GET":
            response = requests.get(url, headers=headers, params=params, timeout=30)
        elif method.upper() == "POST":
            response = requests.post(url, json=data, headers=headers, params=params, timeout=30)
        elif method.upper() == "PUT":
            response = requests.put(url, json=data, headers=headers, params=params, timeout=30)
        elif method.upper() == "DELETE":
            response = requests.delete(url, headers=headers, params=params, timeout=30)
        else:
            raise ValueError(f"Unsupported method: {method}")
            
        return response
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")
        return None

def get_auth_headers():
    """Get authorization headers with token"""
    if not access_token:
        return {}
    return {"Authorization": f"Bearer {access_token}"}

def get_tenant_params():
    """Get tenant_id parameter"""
    if not tenant_id:
        return {}
    return {"tenant_id": tenant_id}

# ============ TEST FUNCTIONS ============

def test_health_check():
    """Test health endpoint"""
    try:
        response = make_request("GET", "/health")
        if response and response.status_code == 200:
            data = response.json()
            if "status" in data and data["status"] == "ok":
                log_test("Health Check", "PASS", f"Status: {data['status']}")
                return True
            else:
                log_test("Health Check", "FAIL", f"Invalid response: {data}")
                return False
        else:
            log_test("Health Check", "FAIL", f"Status: {response.status_code if response else 'No response'}")
            return False
    except Exception as e:
        log_test("Health Check", "FAIL", f"Exception: {str(e)}")
        return False

def test_login():
    """Test authentication login"""
    global access_token, refresh_token, tenant_id, user_data
    
    try:
        data = {
            "username": TEST_USERNAME,
            "password": TEST_PASSWORD
        }
        
        response = make_request("POST", "/auth/login", data=data)
        
        if response and response.status_code == 200:
            result = response.json()
            
            if "accessToken" in result and "user" in result:
                access_token = result["accessToken"]
                refresh_token = result.get("refreshToken")
                user_data = result["user"]
                
                # Extract tenant_id from user tenants
                if user_data.get("tenants") and len(user_data["tenants"]) > 0:
                    tenant_id = user_data["tenants"][0]["tenant_id"]
                    log_test("Authentication Login", "PASS", 
                           f"User: {user_data.get('username')}, Tenant: {tenant_id}")
                    return True
                else:
                    log_test("Authentication Login", "FAIL", "No tenants found for user")
                    return False
            else:
                log_test("Authentication Login", "FAIL", f"Missing tokens in response: {result}")
                return False
        else:
            log_test("Authentication Login", "FAIL", 
                   f"Status: {response.status_code if response else 'No response'}")
            return False
    except Exception as e:
        log_test("Authentication Login", "FAIL", f"Exception: {str(e)}")
        return False

def test_token_refresh():
    """Test token refresh"""
    try:
        if not refresh_token:
            log_test("Token Refresh", "SKIP", "No refresh token available")
            return False
            
        data = {"refreshToken": refresh_token}
        response = make_request("POST", "/auth/refresh", data=data)
        
        if response and response.status_code == 200:
            result = response.json()
            if "accessToken" in result:
                log_test("Token Refresh", "PASS", "New access token received")
                return True
            else:
                log_test("Token Refresh", "FAIL", f"No access token in response: {result}")
                return False
        else:
            log_test("Token Refresh", "FAIL", 
                   f"Status: {response.status_code if response else 'No response'}")
            return False
    except Exception as e:
        log_test("Token Refresh", "FAIL", f"Exception: {str(e)}")
        return False

def test_me_endpoint():
    """Test /me endpoint"""
    try:
        response = make_request("GET", "/me", headers=get_auth_headers(), params=get_tenant_params())
        
        if response and response.status_code == 200:
            result = response.json()
            if "user" in result:
                log_test("Get Current User (/me)", "PASS", f"User ID: {result['user'].get('id')}")
                return True
            else:
                log_test("Get Current User (/me)", "FAIL", f"No user in response: {result}")
                return False
        else:
            log_test("Get Current User (/me)", "FAIL", 
                   f"Status: {response.status_code if response else 'No response'}")
            return False
    except Exception as e:
        log_test("Get Current User (/me)", "FAIL", f"Exception: {str(e)}")
        return False

def test_dashboard():
    """Test dashboard analytics"""
    try:
        response = make_request("GET", "/dashboard", headers=get_auth_headers(), params=get_tenant_params())
        
        if response and response.status_code == 200:
            result = response.json()
            
            # Check required fields
            if "revenue" in result and "recentOrders" in result:
                revenue = result["revenue"]
                if all(key in revenue for key in ["today", "last15Days", "last30Days"]):
                    log_test("Dashboard Analytics", "PASS", 
                           f"Today: R${revenue['today']}, 15d: R${revenue['last15Days']}, 30d: R${revenue['last30Days']}")
                    return True
                else:
                    log_test("Dashboard Analytics", "FAIL", f"Missing revenue fields: {revenue}")
                    return False
            else:
                log_test("Dashboard Analytics", "FAIL", f"Missing required fields: {result}")
                return False
        else:
            log_test("Dashboard Analytics", "FAIL", 
                   f"Status: {response.status_code if response else 'No response'}")
            return False
    except Exception as e:
        log_test("Dashboard Analytics", "FAIL", f"Exception: {str(e)}")
        return False

def test_clients_list():
    """Test list clients"""
    try:
        response = make_request("GET", "/clients", headers=get_auth_headers(), params=get_tenant_params())
        
        if response and response.status_code == 200:
            result = response.json()
            if "clients" in result:
                log_test("List Clients", "PASS", f"Found {len(result['clients'])} clients")
                return True
            else:
                log_test("List Clients", "FAIL", f"No clients field in response: {result}")
                return False
        else:
            log_test("List Clients", "FAIL", 
                   f"Status: {response.status_code if response else 'No response'}")
            return False
    except Exception as e:
        log_test("List Clients", "FAIL", f"Exception: {str(e)}")
        return False

def test_create_client():
    """Test create client"""
    global created_client_id
    
    try:
        data = {
            "name": "João Silva",
            "phone": "11987654321",
            "vehicle_plate": "ABC-1234",
            "vehicle_model": "Honda Civic 2020"
        }
        
        response = make_request("POST", "/clients", data=data, 
                              headers=get_auth_headers(), params=get_tenant_params())
        
        if response and response.status_code == 201:
            result = response.json()
            if "client" in result and "id" in result["client"]:
                created_client_id = result["client"]["id"]
                log_test("Create Client", "PASS", f"Client ID: {created_client_id}")
                return True
            else:
                log_test("Create Client", "FAIL", f"No client ID in response: {result}")
                return False
        else:
            log_test("Create Client", "FAIL", 
                   f"Status: {response.status_code if response else 'No response'}")
            return False
    except Exception as e:
        log_test("Create Client", "FAIL", f"Exception: {str(e)}")
        return False

def test_update_client():
    """Test update client"""
    try:
        if not created_client_id:
            log_test("Update Client", "SKIP", "No client ID available")
            return False
            
        data = {
            "name": "João Silva Santos",
            "phone": "11987654321",
            "vehicle_model": "Honda Civic 2021"
        }
        
        response = make_request("PUT", f"/clients/{created_client_id}", data=data,
                              headers=get_auth_headers(), params=get_tenant_params())
        
        if response and response.status_code == 200:
            result = response.json()
            if "client" in result:
                log_test("Update Client", "PASS", f"Updated client: {result['client']['name']}")
                return True
            else:
                log_test("Update Client", "FAIL", f"No client in response: {result}")
                return False
        else:
            log_test("Update Client", "FAIL", 
                   f"Status: {response.status_code if response else 'No response'}")
            return False
    except Exception as e:
        log_test("Update Client", "FAIL", f"Exception: {str(e)}")
        return False

def test_services_list():
    """Test list services"""
    try:
        response = make_request("GET", "/services", headers=get_auth_headers(), params=get_tenant_params())
        
        if response and response.status_code == 200:
            result = response.json()
            if "services" in result:
                log_test("List Services", "PASS", f"Found {len(result['services'])} services")
                return True
            else:
                log_test("List Services", "FAIL", f"No services field in response: {result}")
                return False
        else:
            log_test("List Services", "FAIL", 
                   f"Status: {response.status_code if response else 'No response'}")
            return False
    except Exception as e:
        log_test("List Services", "FAIL", f"Exception: {str(e)}")
        return False

def test_create_service():
    """Test create service"""
    global created_service_id
    
    try:
        data = {
            "name": "Lavagem Completa Premium",
            "description": "Lavagem externa e interna com cera",
            "price": 85.00,
            "duration_minutes": 90
        }
        
        response = make_request("POST", "/services", data=data,
                              headers=get_auth_headers(), params=get_tenant_params())
        
        if response and response.status_code == 201:
            result = response.json()
            if "service" in result and "id" in result["service"]:
                created_service_id = result["service"]["id"]
                log_test("Create Service", "PASS", f"Service ID: {created_service_id}")
                return True
            else:
                log_test("Create Service", "FAIL", f"No service ID in response: {result}")
                return False
        else:
            log_test("Create Service", "FAIL", 
                   f"Status: {response.status_code if response else 'No response'}")
            return False
    except Exception as e:
        log_test("Create Service", "FAIL", f"Exception: {str(e)}")
        return False

def test_orders_list():
    """Test list orders"""
    try:
        response = make_request("GET", "/orders", headers=get_auth_headers(), params=get_tenant_params())
        
        if response and response.status_code == 200:
            result = response.json()
            if "orders" in result:
                log_test("List Orders", "PASS", f"Found {len(result['orders'])} orders")
                return True
            else:
                log_test("List Orders", "FAIL", f"No orders field in response: {result}")
                return False
        else:
            log_test("List Orders", "FAIL", 
                   f"Status: {response.status_code if response else 'No response'}")
            return False
    except Exception as e:
        log_test("List Orders", "FAIL", f"Exception: {str(e)}")
        return False

def test_create_order():
    """Test create order"""
    global created_order_id
    
    try:
        if not created_client_id or not created_service_id:
            log_test("Create Order", "SKIP", "Missing client or service ID")
            return False
            
        data = {
            "client_id": created_client_id,
            "items": [
                {
                    "catalog_item_id": created_service_id,
                    "service_name": "Lavagem Completa Premium",
                    "price": 85.00,
                    "quantity": 1
                }
            ],
            "status": "pending",
            "notes": "Cliente preferencial"
        }
        
        response = make_request("POST", "/orders", data=data,
                              headers=get_auth_headers(), params=get_tenant_params())
        
        if response and response.status_code == 201:
            result = response.json()
            if "order" in result and "id" in result["order"]:
                created_order_id = result["order"]["id"]
                log_test("Create Order", "PASS", f"Order ID: {created_order_id}")
                return True
            else:
                log_test("Create Order", "FAIL", f"No order ID in response: {result}")
                return False
        else:
            log_test("Create Order", "FAIL", 
                   f"Status: {response.status_code if response else 'No response'}")
            return False
    except Exception as e:
        log_test("Create Order", "FAIL", f"Exception: {str(e)}")
        return False

def test_update_order():
    """Test update order status"""
    try:
        if not created_order_id:
            log_test("Update Order", "SKIP", "No order ID available")
            return False
            
        data = {
            "status": "paid",
            "payment_method": "PIX"
        }
        
        response = make_request("PUT", f"/orders/{created_order_id}", data=data,
                              headers=get_auth_headers(), params=get_tenant_params())
        
        if response and response.status_code == 200:
            result = response.json()
            if "order" in result:
                log_test("Update Order", "PASS", f"Status: {result['order']['status']}")
                return True
            else:
                log_test("Update Order", "FAIL", f"No order in response: {result}")
                return False
        else:
            log_test("Update Order", "FAIL", 
                   f"Status: {response.status_code if response else 'No response'}")
            return False
    except Exception as e:
        log_test("Update Order", "FAIL", f"Exception: {str(e)}")
        return False

def test_get_single_order():
    """Test get single order with items"""
    try:
        if not created_order_id:
            log_test("Get Single Order", "SKIP", "No order ID available")
            return False
            
        response = make_request("GET", f"/orders/{created_order_id}",
                              headers=get_auth_headers(), params=get_tenant_params())
        
        if response and response.status_code == 200:
            result = response.json()
            if "order" in result and "items" in result["order"]:
                log_test("Get Single Order", "PASS", 
                       f"Order with {len(result['order']['items'])} items")
                return True
            else:
                log_test("Get Single Order", "FAIL", f"Missing order or items: {result}")
                return False
        else:
            log_test("Get Single Order", "FAIL", 
                   f"Status: {response.status_code if response else 'No response'}")
            return False
    except Exception as e:
        log_test("Get Single Order", "FAIL", f"Exception: {str(e)}")
        return False

def test_pdf_generation():
    """Test PDF generation"""
    try:
        if not created_order_id:
            log_test("PDF Generation", "SKIP", "No order ID available")
            return False
            
        response = make_request("GET", f"/orders/{created_order_id}/pdf",
                              headers=get_auth_headers(), params=get_tenant_params())
        
        if response and response.status_code == 200:
            content_type = response.headers.get('content-type', '')
            if 'application/pdf' in content_type:
                log_test("PDF Generation", "PASS", f"PDF size: {len(response.content)} bytes")
                return True
            else:
                log_test("PDF Generation", "FAIL", f"Wrong content type: {content_type}")
                return False
        else:
            log_test("PDF Generation", "FAIL", 
                   f"Status: {response.status_code if response else 'No response'}")
            return False
    except Exception as e:
        log_test("PDF Generation", "FAIL", f"Exception: {str(e)}")
        return False

def test_team_list():
    """Test list team members"""
    try:
        response = make_request("GET", "/team", headers=get_auth_headers(), params=get_tenant_params())
        
        if response and response.status_code == 200:
            result = response.json()
            if "team" in result:
                log_test("List Team Members", "PASS", f"Found {len(result['team'])} members")
                return True
            else:
                log_test("List Team Members", "FAIL", f"No team field in response: {result}")
                return False
        else:
            log_test("List Team Members", "FAIL", 
                   f"Status: {response.status_code if response else 'No response'}")
            return False
    except Exception as e:
        log_test("List Team Members", "FAIL", f"Exception: {str(e)}")
        return False

def test_team_invite():
    """Test team invite"""
    try:
        data = {
            "email": "test@example.com",
            "role": "attendant"
        }
        
        response = make_request("POST", "/team/invite", data=data,
                              headers=get_auth_headers(), params=get_tenant_params())
        
        if response and response.status_code == 201:
            result = response.json()
            if "message" in result:
                log_test("Team Invite", "PASS", f"Message: {result['message']}")
                return True
            else:
                log_test("Team Invite", "FAIL", f"No message in response: {result}")
                return False
        else:
            log_test("Team Invite", "FAIL", 
                   f"Status: {response.status_code if response else 'No response'}")
            return False
    except Exception as e:
        log_test("Team Invite", "FAIL", f"Exception: {str(e)}")
        return False

def test_delete_service():
    """Test delete service"""
    try:
        if not created_service_id:
            log_test("Delete Service", "SKIP", "No service ID available")
            return False
            
        response = make_request("DELETE", f"/services/{created_service_id}",
                              headers=get_auth_headers(), params=get_tenant_params())
        
        if response and response.status_code == 200:
            result = response.json()
            if "message" in result:
                log_test("Delete Service", "PASS", f"Message: {result['message']}")
                return True
            else:
                log_test("Delete Service", "FAIL", f"No message in response: {result}")
                return False
        else:
            log_test("Delete Service", "FAIL", 
                   f"Status: {response.status_code if response else 'No response'}")
            return False
    except Exception as e:
        log_test("Delete Service", "FAIL", f"Exception: {str(e)}")
        return False

def test_delete_client():
    """Test delete client"""
    try:
        if not created_client_id:
            log_test("Delete Client", "SKIP", "No client ID available")
            return False
            
        response = make_request("DELETE", f"/clients/{created_client_id}",
                              headers=get_auth_headers(), params=get_tenant_params())
        
        if response and response.status_code == 200:
            result = response.json()
            if "message" in result:
                log_test("Delete Client", "PASS", f"Message: {result['message']}")
                return True
            else:
                log_test("Delete Client", "FAIL", f"No message in response: {result}")
                return False
        else:
            log_test("Delete Client", "FAIL", 
                   f"Status: {response.status_code if response else 'No response'}")
            return False
    except Exception as e:
        log_test("Delete Client", "FAIL", f"Exception: {str(e)}")
        return False

# ============ MAIN TEST EXECUTION ============

def run_all_tests():
    """Run all backend tests in sequence"""
    print("=" * 80)
    print("🚀 ESPAÇO BRAITE BACKEND API TESTS")
    print("=" * 80)
    
    test_results = []
    
    # Test sequence
    tests = [
        ("Health Check", test_health_check),
        ("Authentication Login", test_login),
        ("Token Refresh", test_token_refresh),
        ("Get Current User", test_me_endpoint),
        ("Dashboard Analytics", test_dashboard),
        ("List Clients", test_clients_list),
        ("Create Client", test_create_client),
        ("Update Client", test_update_client),
        ("List Services", test_services_list),
        ("Create Service", test_create_service),
        ("List Orders", test_orders_list),
        ("Create Order", test_create_order),
        ("Update Order", test_update_order),
        ("Get Single Order", test_get_single_order),
        ("PDF Generation", test_pdf_generation),
        ("List Team Members", test_team_list),
        ("Team Invite", test_team_invite),
        ("Delete Service", test_delete_service),
        ("Delete Client", test_delete_client),
    ]
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            test_results.append((test_name, result))
        except Exception as e:
            log_test(test_name, "FAIL", f"Unexpected error: {str(e)}")
            test_results.append((test_name, False))
    
    # Summary
    print("\n" + "=" * 80)
    print("📊 TEST SUMMARY")
    print("=" * 80)
    
    passed = sum(1 for _, result in test_results if result)
    total = len(test_results)
    
    for test_name, result in test_results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name}")
    
    print(f"\n🎯 Results: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
    
    if passed == total:
        print("🎉 All tests passed! Backend API is working correctly.")
    else:
        print(f"⚠️  {total - passed} tests failed. Check the logs above for details.")
    
    return test_results

if __name__ == "__main__":
    run_all_tests()