# Follow System Idempotency Test

## Manual Testing Checklist

### Test 1: Rapid Follow/Unfollow Clicks
1. Navigate to a user's profile
2. Click the "Follow" button rapidly 5-10 times
3. **Expected**: Button should only trigger once (loading state prevents duplicates)
4. **Verify**: Check network tab - should see only one request, or multiple requests all return 200
5. **Verify**: Follower count increases by exactly 1

### Test 2: Already Following State
1. Follow a user (wait for success)
2. Try to follow them again (by clicking the follow button if it appears)
3. **Expected**: Returns 200 with `alreadyFollowing: true`
4. **Verify**: No duplicate entries in database
5. **Verify**: Follower count doesn't change

### Test 3: Not Following State (Unfollow)
1. Unfollow a user you're not following
2. **Expected**: Returns 200 with `notFollowing: true`
3. **Verify**: No errors shown to user
4. **Verify**: Follower count doesn't go negative

### Test 4: Concurrent Requests from Multiple Devices
1. Open the same user profile on two different browsers/devices
2. Click follow on both at the same time
3. **Expected**: Both requests succeed (one does the follow, one returns "already following")
4. **Verify**: Only one follow relationship exists in database
5. **Verify**: Follower count increases by exactly 1

### Test 5: Network Error Recovery
1. Open DevTools Network tab
2. Set throttling to "Offline"
3. Click follow button
4. **Expected**: Optimistic update shows followed state
5. **Verify**: Error message appears after timeout
6. **Verify**: UI reverts to unfollowed state
7. Set throttling back to "Online"
8. Click follow again
9. **Expected**: Follow succeeds

### Test 6: Socket Events
1. Follow a user
2. **Expected**: Real-time notification sent to followed user
3. **Verify**: Notification contains correct follower info
4. Unfollow the user
5. **Expected**: Real-time unfollow event sent
6. **Verify**: UI updates on both ends

### Test 7: Optimistic Update Rollback
1. Mock a 500 error from the API (use DevTools to block request)
2. Click follow button
3. **Expected**: UI immediately shows followed state
4. **Verify**: When API fails, UI reverts to unfollowed state
5. **Verify**: Error toast appears

## Database Verification

After running tests, verify in MongoDB:

```javascript
// Check for duplicate follows
db.Followers.aggregate([
  {
    $group: {
      _id: { followerId: "$followerId", followedId: "$followedId" },
      count: { $sum: 1 }
    }
  },
  {
    $match: { count: { $gt: 1 } }
  }
])

// Should return empty array - no duplicates

// Verify unique index exists
db.Followers.getIndexes()
// Should show "unique_follower_followed" index
```

## Performance Testing

### Test concurrent follows:
```bash
# Using Apache Bench or similar tool
ab -n 100 -c 10 -T 'application/json' \
   -p follow-payload.json \
   -H "Cookie: velo_12=YOUR_TOKEN" \
   https://velo-virid.vercel.app/api/follow
```

Where `follow-payload.json`:
```json
{
  "followerId": "USER_ID_1",
  "followedId": "USER_ID_2",
  "follow": true,
  "time": "2026-11-14T10:00:00.000Z"
}
```

**Expected**: 
- All 100 requests return 200
- Only 1 follow relationship created
- Follower count = initial + 1

## Success Criteria

✅ No 409 errors returned  
✅ No 400 errors for idempotent operations  
✅ No duplicate follow relationships in database  
✅ Follower counts are accurate  
✅ UI updates are instant (optimistic)  
✅ UI reverts correctly on error  
✅ Socket events fire correctly  
✅ Unique index prevents data corruption  
