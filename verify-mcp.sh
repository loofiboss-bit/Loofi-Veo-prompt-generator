#!/usr/bin/env bash

# MCP Server Configuration Verification Script
# Checks all MCP configurations for correctness

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}    MCP Server Configuration Verification${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}\n"

PASS=0
FAIL=0
WARN=0

# Helper functions
check_pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASS++))
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
    ((FAIL++))
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARN++))
}

# 1. Check Docker MCP Gateway
echo -e "${BLUE}1. Docker MCP Gateway${NC}"
if command -v docker &> /dev/null; then
    check_pass "Docker CLI installed"
    
    if timeout 3 docker mcp gateway run > /dev/null 2>&1 &
        sleep 1
        if pgrep -f "docker mcp gateway" > /dev/null; then
            killall docker 2>/dev/null || true
            check_pass "Docker MCP Gateway responding"
        else
            check_fail "Docker MCP Gateway not responding"
        fi
    then
        check_pass "Docker daemon running"
    else
        check_fail "Docker daemon not running"
    fi
else
    check_fail "Docker CLI not installed"
fi
echo ""

# 2. Check .mcp.json
echo -e "${BLUE}2. Generic MCP Config (.mcp.json)${NC}"
if [ -f ".mcp.json" ]; then
    check_pass "File exists"
    
    if command -v jq &> /dev/null; then
        if jq . .mcp.json > /dev/null 2>&1; then
            check_pass "Valid JSON syntax"
            
            if jq -e '.mcpServers["docker-mcp"].type == "stdio"' .mcp.json > /dev/null; then
                check_pass "Type is 'stdio'"
            else
                check_warn "Type not set to 'stdio' (may still work)"
            fi
            
            if jq -e '.mcpServers["docker-mcp"].command == "docker"' .mcp.json > /dev/null; then
                check_pass "Command is 'docker'"
            else
                check_fail "Command should be 'docker'"
            fi
            
            if jq -e '.mcpServers["docker-mcp"].args[0] == "mcp"' .mcp.json > /dev/null; then
                check_pass "Args contain 'mcp gateway run'"
            else
                check_fail "Args should be ['mcp', 'gateway', 'run']"
            fi
        else
            check_fail "Invalid JSON syntax"
        fi
    else
        check_warn "jq not installed (cannot validate JSON)"
    fi
else
    check_fail "File not found"
fi
echo ""

# 3. Check .claude/settings.json
echo -e "${BLUE}3. Claude MCP Config (.claude/settings.json)${NC}"
if [ -f ".claude/settings.json" ]; then
    check_pass "File exists"
    
    if command -v jq &> /dev/null; then
        if jq . .claude/settings.json > /dev/null 2>&1; then
            check_pass "Valid JSON syntax"
            
            if jq -e '.mcpServers["docker-mcp"]' .claude/settings.json > /dev/null; then
                check_pass "Docker MCP configured"
            else
                check_fail "Docker MCP not configured"
            fi
            
            if jq -e '.platform == "claude"' .claude/settings.json > /dev/null; then
                check_pass "Platform set to 'claude'"
            else
                check_fail "Platform should be 'claude'"
            fi
            
            agent_count=$(jq '.agents | length' .claude/settings.json)
            if [ "$agent_count" -ge 5 ]; then
                check_pass "Has $agent_count agents configured"
            else
                check_warn "Only $agent_count agents (expected 7)"
            fi
            
            if jq -e '.memoryDir == ".claude/agent-memory"' .claude/settings.json > /dev/null; then
                check_pass "Agent memory directory configured"
            else
                check_warn "Agent memory directory not set (memory will not persist)"
            fi
        else
            check_fail "Invalid JSON syntax"
        fi
    else
        check_warn "jq not installed (cannot validate JSON)"
    fi
else
    check_fail "File not found"
fi
echo ""

# 4. Check .copilot/mcp-config.json
echo -e "${BLUE}4. Copilot MCP Config (.copilot/mcp-config.json)${NC}"
if [ -f ".copilot/mcp-config.json" ]; then
    check_pass "File exists"
    
    if command -v jq &> /dev/null; then
        if jq . .copilot/mcp-config.json > /dev/null 2>&1; then
            check_pass "Valid JSON syntax"
            
            if jq -e '.mcpServers["docker-mcp"].type == "stdio"' .copilot/mcp-config.json > /dev/null; then
                check_pass "Type is 'stdio'"
            else
                check_fail "Type should be 'stdio'"
            fi
            
            if jq -e '.mcpServers["docker-mcp"].command == "docker"' .copilot/mcp-config.json > /dev/null; then
                check_pass "Command is 'docker'"
            else
                check_fail "Command should be 'docker'"
            fi
        else
            check_fail "Invalid JSON syntax"
        fi
    else
        check_warn "jq not installed (cannot validate JSON)"
    fi
else
    check_fail "File not found"
fi
echo ""

# 5. Check hook files
echo -e "${BLUE}5. Claude Hooks${NC}"
if [ -f ".claude/hooks/pre-tool-use.cjs" ]; then
    check_pass "Pre-tool hook exists"
else
    check_warn "Pre-tool hook not found (hooks will not fire)"
fi

if [ -f ".claude/hooks/post-tool-use.cjs" ]; then
    check_pass "Post-tool hook exists"
else
    check_warn "Post-tool hook not found (hooks will not fire)"
fi
echo ""

# 6. Check agent memory directory
echo -e "${BLUE}6. Agent Memory${NC}"
if [ -d ".claude/agent-memory" ]; then
    check_pass "Memory directory exists"
    
    if [ -w ".claude/agent-memory" ]; then
        check_pass "Memory directory is writable"
    else
        check_fail "Memory directory not writable"
    fi
else
    check_warn "Memory directory not found (will create on first use)"
fi
echo ""

# 7. Check skills directories
echo -e "${BLUE}7. Skills Directories${NC}"
if [ -d ".claude/skills" ]; then
    skill_count=$(find .claude/skills -type f 2>/dev/null | wc -l)
    if [ "$skill_count" -gt 0 ]; then
        check_pass "Claude skills directory has $skill_count files"
    else
        check_warn "Claude skills directory is empty"
    fi
else
    check_warn "Claude skills directory not found"
fi

if [ -d ".copilot/skills" ]; then
    skill_count=$(find .copilot/skills -type f 2>/dev/null | wc -l)
    if [ "$skill_count" -gt 0 ]; then
        check_pass "Copilot skills directory has $skill_count files"
    else
        check_warn "Copilot skills directory is empty"
    fi
else
    check_warn "Copilot skills directory not found"
fi
echo ""

# Summary
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}    Summary${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Pass: $PASS${NC}"
echo -e "${YELLOW}⚠ Warnings: $WARN${NC}"
echo -e "${RED}✗ Fail: $FAIL${NC}\n"

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✅ All MCP configurations are valid!${NC}\n"
    exit 0
else
    echo -e "${RED}❌ Fix the failures above before using MCP${NC}\n"
    exit 1
fi
