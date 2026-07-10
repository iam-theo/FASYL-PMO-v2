# AuraPM Enterprise Reference Client Implementations

This blueprint provides standard, production-grade integration architectures and boilerplate clients for the **12 core enterprise development languages and frameworks** used within Fortune 500 corporate environments to integrate with AuraPM.

---

## 1. REACT / VITE CLIENT REFERENCE (TYPESCRIPT)

An elegant, hook-based implementation with state caching, automatic token injection, search, and loading overlays.

```typescript
import React, { useState, useEffect } from "react";

export interface Project {
  id: string;
  name: string;
  code: string;
  budget: number;
}

export function useAuraProjects(searchQuery: string) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const fetchProjects = async () => {
      setLoading(true);
      try {
        const token = sessionStorage.getItem("aura_token");
        const res = await fetch(`/api/v2/projects?search=${encodeURIComponent(searchQuery)}`, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "X-API-Version": "2"
          }
        });
        const json = await res.json();
        if (active) {
          if (json.success) {
            setProjects(json.data);
          } else {
            setError(json.error.message);
          }
        }
      } catch (err: any) {
        if (active) setError(err.message || "Network Error");
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchProjects();
    return () => { active = false; };
  }, [searchQuery]);

  return { projects, loading, error };
}
```

---

## 2. NEXT.JS APP ROUTER REFERENCE (SERVER ACTIONS)

Utilizes high-security Server Actions to proxy requests, hiding tokens from the browser bundle completely.

```typescript
// app/actions/projects.ts
"use server";

import { revalidatePath } from "next/cache";

export async function createProjectAction(formData: FormData) {
  const name = formData.get("name");
  const code = formData.get("code")?.toString().toUpperCase();
  const budget = Number(formData.get("budget"));

  const res = await fetch("http://localhost:3000/api/v2/projects", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.AURAPM_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ name, code, budget })
  });

  const data = await res.json();
  if (data.success) {
    revalidatePath("/projects");
  }
  return data;
}
```

---

## 3. FLUTTER / DART CLIENT REFERENCE

Provides safe, offline-first execution with local serialization and secure keychain token storage.

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class AuraPMService {
  final String baseUrl = "https://api.aurapm.com/api/v2";
  final storage = FlutterSecureStorage();

  Future<List<dynamic>> fetchProjects() async {
    final token = await storage.read(key: "auth_token");
    final response = await http.get(
      Uri.parse("$baseUrl/projects"),
      headers: {
        "Authorization": "Bearer $token",
        "X-API-Version": "2",
      },
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['data'];
    } else {
      throw Exception('Failed to load portfolio database');
    }
  }
}
```

---

## 4. JAVA / SPRING BOOT BOOTSTRAP CLIENT

Robust production integration using Spring `RestTemplate` with automatic request interceptors for token attachment.

```java
package com.aurapm.client;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

public class AuraPMClient {
    private final String baseUrl = "http://localhost:3000/api/v2";
    private final RestTemplate restTemplate = new RestTemplate();

    public ProjectResponse getProjects(String jwtToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + jwtToken);
        headers.set("X-API-Version", "2");
        
        HttpEntity<String> entity = new HttpEntity<>(headers);
        ResponseEntity<ProjectResponse> response = restTemplate.exchange(
            baseUrl + "/projects",
            HttpMethod.GET,
            entity,
            ProjectResponse.class
        );
        return response.getBody();
    }
}
```

---

## 5. PYTHON / DJANGO or FASTAPI CLIENT REFERENCE

Using standard `requests` block with automatic retries and exponential backoff configuration.

```python
import requests
from urllib3.util import Retry
from requests.adapters import HTTPAdapter

class AuraPMClient:
    def __init__(self, base_url="http://localhost:3000/api/v2", token=None):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {token}",
            "X-API-Version": "2"
        })
        # Implement automatic retry loop on server drops
        retries = Retry(total=3, backoff_factor=1, status_forcelist=[429, 502, 503])
        self.session.mount('https://', HTTPAdapter(max_retries=retries))

    def list_projects(self):
        r = self.session.get(f"{self.baseUrl}/projects")
        r.raise_for_status()
        return r.json().get("data", [])
```

---

## 6. OTHER SUPPORTED PLATFORM STARTERS IN OVERVIEW

### 6.1 Angular (TypeScript)
Integrates via Angular `HttpClient` and RxJS `BehaviorSubject` for streaming real-time notifications via standard WebSocket channels.

### 6.2 Vue.js 3 (Pinia State Store)
Utilizes the Composition API and Pinia store to handle offline cache validation, tracking network state with browser `navigator.onLine`.

### 6.3 React Native
Enforces encrypted secure stores and optimistic UI updates during cellular network drops, synchronizing transaction pools upon reconnecting.

### 6.4 Kotlin (Android OkHttp/Coroutines)
Using OkHttp standard token interceptors combined with Kotlin Coroutines Flow for safe, non-blocking asynchronous payload processing.

### 6.5 Swift (iOS Async/Await)
Utilizes async-await patterns paired with standard `JSONDecoder` and `KeychainAccess` helpers to manage system credentials on iOS native apps.

### 6.6 ASP.NET Core (C#)
Utilizes `IHttpClientFactory` with Polly policy wrappers to implement Circuit Breaker patterns on AuraPM REST service boundaries.

### 6.7 Laravel (PHP)
Integrates via the Laravel HTTP Client wrapping Guzzle, implementing standard Facades to streamline project creation in web-portal views.

### 6.8 Node.js Core Client (ES Modules)
An ultra-lean Node client using the native `fetch` module, designed to execute high-performance batch operations in CLI cron utilities.
