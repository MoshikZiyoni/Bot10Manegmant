import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PhoneIncoming, PhoneOutgoing, Search, Filter } from 'lucide-react';
import axios from 'axios';

function CallList() {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const baseURL = process.env.REACT_APP_API_URL || '';
  const [filters, setFilters] = useState({
    direction: '',
    status: '',
    search: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchCalls();
  }, [page, filters]);

  const fetchCalls = async () => {
    setLoading(true);
    try {
      let url = `${baseURL}/api/calls/?page=${page}`;

      if (filters.direction) url += `&direction=${filters.direction}`;
      if (filters.status) url += `&status=${filters.status}`;
      if (filters.search) url += `&search=${filters.search}`;
      if (filters.has_offer) url += `&has_offer=${filters.has_offer}`;

      const response = await axios.get(url);
      setCalls(response.data.results);
      console.log(calls)
      setTotalPages(Math.ceil(response.data.count / 10)); // Assuming 10 items per page
      setLoading(false);
    } catch (error) {
      console.error('Error fetching calls:', error);
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setPage(1); // Reset to first page when filters change
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1); // Reset to first page on new search
  };

  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  return (
    <div className="call-list">
      <div className="page-header">
        <h2>Call History</h2>
        <Link to="/calls/new" className="btn-primary">New Call</Link>
      </div>

      <div className="filters-container">
        <form onSubmit={handleSearch} className="search-form">
          <div className="search-input">
            <input
              type="text"
              placeholder="Search by phone number..."
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
            />
            <button type="submit" className="btn-search">
              <Search size={16} />
            </button>
          </div>

          <button
            type="button"
            className="btn-filter"
            onClick={toggleFilters}
          >
            <Filter size={16} />
            Filters
          </button>
        </form>

        {showFilters && (
          <div className="advanced-filters">
            <div className="filter-group">
              <label>Direction:</label>
              <select
                name="direction"
                value={filters.direction}
                onChange={handleFilterChange}
              >
                <option value="">All</option>
                <option value="in">Incoming</option>
                <option value="out">Outgoing</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Status:</label>
              <select
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
              >
                <option value="">All</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Has Offer:</label>
              <select
                name="has_offer"
                value={filters.has_offer}
                onChange={handleFilterChange}
              >
                <option value="">All</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="loading">Loading calls...</div>
      ) : (
        <>
          <table className="calls-table">
            <thead>
              <tr>
                <th>Phone Number</th>
                <th>Direction</th>
                <th>Status</th>
                <th>Duration</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {calls.map(call => (


                <tr key={call.id}>
                  <td>{call.phone_number}</td>
                  <td>
                    {call.direction === 'in' ?
                      <PhoneIncoming size={16} className="icon-incoming" /> :
                      <PhoneOutgoing size={16} className="icon-outgoing" />}
                    {call.direction === 'in' ? 'Incoming' : 'Outgoing'}
                  </td>
                  <td>
                    <span className={`status-badge status-${call.status}`}>
                      {call.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td>{(call.total_duration / 60).toFixed(2)} min</td>
                  <td>{call.formatted_created_at}</td>
                  <td>
                    <Link to={`/calls/${call.id}`} className="btn-view">View</Link>
                  </td>
                </tr>

              ))}
            </tbody>
          </table>

          <div className="pagination">
            <button
              onClick={() => setPage(prev => Math.max(prev - 1, 1))}
              disabled={page === 1}
              className="btn-page"
            >
              Previous
            </button>

            <span className="page-info">Page {page} of {totalPages}</span>

            <button
              onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
              disabled={page === totalPages}
              className="btn-page"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default CallList;