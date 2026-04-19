proxy_http_version 1.1;
proxy_set_header Host              $host;
proxy_set_header X-Real-IP         $remote_addr;
proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
# Cloudflare Flexible: el cliente habla HTTPS con CF, CF habla HTTP con nginx.
# X-Forwarded-Proto = https refleja el esquema real del cliente.
proxy_set_header X-Forwarded-Proto https;
proxy_set_header X-Forwarded-Host  $host;
proxy_set_header X-Request-ID      $http_x_request_id;
proxy_set_header Connection        "";

proxy_read_timeout   60s;
proxy_send_timeout   60s;
proxy_connect_timeout 10s;
proxy_buffering on;
